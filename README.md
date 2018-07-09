GPG based domain ownership verification
---------------------------------------

### The problem

Currently when sites need to verify ownership of a domain they utilise a couple of similar options:
* Place a random marker file somewhere in the web root
* Require a random DNS record to be added
* Email a list of addresses (e.g what is found via WHOIS, plus webmaster/admin@<domain>)

These can be painful because:
* You might need to deploy code to production to handle the file request
* You might need to go through various layers of red tape to get the change made
* You may need to find where those emails actually go
* If your email is hacked it may allow nefarious actors to obtain valid SSL certificates for your domain.

All these options block the workflow and depending on your organisation are burdensome for individual contributors who just want to start using a new tool.

### The proposal

Rather than have sites specify some random content or utilise insecure email, we utilise the 'Web of Trust', specify a standard DNS location to query for domain owner keys `_owners.<domain>` and provide immediate ownership verification via GPG message signing.

### How it works

The user can verify domain ownership via:

1. Setting a DNS record (at _owners.<domain>, a one time action however this scales out to allow different people to 'own' different subdomains) containing email addresses or Keybase usernames for the domain owners.
2. Sign a message with one of the keys specified in the ownership record.
3. Submit the domain, along with the signed message to the ownership checker. All keys will be checked against the signed message, if the message has been signed by an owner then the user regarded as a domain owner.

### Current limitations
* An email can only map to a single GPG key
* Similarly, a keybase username may only have a single key associated
* Subdomains must be explicitly owned, i.e foo.example.com will only check _owners.foo.example.com. The code should walk up the tree if no explicit owners are found.
* It should be possible to specify a specific Key ID as well, so tobias@modestmind.net, [tobio](https://keybase.io/tobio) and [0xABD79D91C0966851](https://pgp.mit.edu/pks/lookup?op=get&search=0xABD79D91C0966851) should all be valid entries in the domain record
* The full keybase user URL should also probably work.

### Example usage

Example records are available for `_owners.modestmind.net`

```$ dig TXT _owners.modestmind.net

; <<>> DiG 9.10.6 <<>> TXT _owners.modestmind.net
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 11131
;; flags: qr rd ra; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 4096
;; QUESTION SECTION:
;_owners.modestmind.net.    IN  TXT

;; ANSWER SECTION:
_owners.modestmind.net. 3600  IN  TXT "tobias@modestmind.net"
_owners.modestmind.net. 3600  IN  TXT "tobio"

;; Query time: 79 msec
;; SERVER: 192.168.64.1#53(192.168.64.1)
;; WHEN: Mon Jul 09 11:41:20 AEST 2018
;; MSG SIZE  rcvd: 103
```

`webtask/signed.txt` has a message signed with my Keybase key.

The endpoint can be exercised via curl:
`curl https://wt-bdd1a57e37bb559554e268267c174bf4-0.sandbox.auth0-extend.com/confirm-domain-ownership -v -X POST -d "domain=modestmind.net" --data-urlencode "signedMessage@signed.txt" -H "Expect:"`

Or via the bundled [React UI](https://tobio.github.io/gpg-domain-ownership/).