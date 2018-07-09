const PGP_KEYSERVER = 'https://keyserver.ubuntu.com';
const domainOwnersRecordName = (domain) => `_owners.${domain}`;
const keybaseUserKeysUrl = (user) => `https://keybase.io/${user}/pgp_keys.asc`;

const dns = require('dns');
const {promisify} = require('util');

const {validate: isEmail} = require('isemail');
const openpgp = require('openpgp');
const request = require('request-promise');

const resolveTxt = promisify(dns.resolveTxt);
const hkp = new openpgp.HKP(PGP_KEYSERVER);

async function getOwnersForDomain(domain) {
  // If the DNS lookup fails, just assume there are no owners.
  const rawOwners = await resolveTxt(domainOwnersRecordName(domain)).catch(() => []);
  return rawOwners.map((owner) => owner.join(''));
}

function getKeyForOwner(owner) {
  console.log('Getting key for owner', {owner});
  var locator = isEmail(owner) ? getKeyFromEmail : getKeyFromKeybase;
  return locator(owner);
}

function getKeyFromEmail(owner) {
  console.log('Getting key for email', {email: owner});
  return hkp.lookup({query: owner});
}

function getKeyFromKeybase(owner) {
  console.log('Getting key from keybase', {user: owner});
  return request.get(keybaseUserKeysUrl(owner)).catch((err) => {
    // Ignore 404's
    if(err.statusCode === 404) return null;

    // Otherwise re-raise
    throw err;
  });
}

async function getOwnerKeysForDomain(domain) {
  const specifiedOwners = await getOwnersForDomain(domain);
  const keySearchResults = await Promise.all(specifiedOwners.map(async (owner) => ({
    owner,
    publicKey: await getKeyForOwner(owner)
  })));
  const availableKeys = keySearchResults.filter(({publicKey}) => !!publicKey);
  availableKeys.forEach((key) => { key.parsedKey = openpgp.key.readArmored(key.publicKey) });

  return availableKeys;
}

async function verifyDomainOwnership(ownerKeys, parsedVerification) {
  const verifiedSignatures = await Promise.all(ownerKeys.map(async ({owner, parsedKey}) => {
    const options = {
      message: parsedVerification,
      publicKeys: parsedKey.keys
    };

    return {
      owner,
      signature: await openpgp.verify(options)
    };
  }));
  return verifiedSignatures.filter(({signature}) => signature.signatures[0].valid);
}

/**
* @param context {WebtaskContext}
*/
module.exports = async (context, req, res) => {
  const sendResponse = (status, message) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({message}));
  };

  // Request variables.
  const domainToVerify = req.body.domain;
  const signedVerification = req.body.verification;
  let parsedVerification;

  try {
    // Parse the provided signed message before wasting time on key lookups
    parsedVerification = openpgp.cleartext.readArmored(signedVerification);
  } catch (e) {
    return sendResponse(400, `Verification data was not a valid PGP signed message. ${e.message}.`);
  }

  const ownerKeys = await getOwnerKeysForDomain(domainToVerify);
  console.log('Got keys for website owners', {ownerKeys});

  const verifiedOwners = await verifyDomainOwnership(ownerKeys, parsedVerification);
  if(!verifiedOwners.length) {
    return sendResponse(400, 'Message was not signed by a domain owner');
  }

  return sendResponse(200, `Domain ownership established. Message was signed by ${verifiedOwners[0].owner}`);
};