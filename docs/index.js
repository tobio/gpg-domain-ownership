
const {
  Button,
  colors,
  createMuiTheme,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Icon,
  MuiThemeProvider,
  Paper,
  TextField,
  Typography,
  withStyles,
} = window['material-ui'];
const {axios} = window;

const theme = createMuiTheme({
  palette: {
    primary: {
      light: colors.purple[300],
      main: colors.purple[500],
      dark: colors.purple[700],
    },
    secondary: {
      light: colors.green[300],
      main: colors.green[500],
      dark: colors.green[700],
    },
  },
});

const styles = theme => ({
  root: {
    textAlign: 'center',
    paddingTop: theme.spacing.unit * 20,
  },
  box: {
    padding: '20px'
  },
  boxContainer: {
    marginTop: theme.spacing.unit,
    marginLeft: '20%',
    marginRight: '20%'
  },
  textField: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit,
    marginBottom: theme.spacing.unit,
    width: 300,
  },
});

class Index extends React.Component {
  state = {
    open: false,
    message: null
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  submit = (e) => {
    e.preventDefault();
    this.setState({
      sending: true,
    });

    const {domain, verification} = this.state;
    axios.post('https://wt-bdd1a57e37bb559554e268267c174bf4-0.sandbox.auth0-extend.com/confirm-domain-ownership', {
      domain,
      verification
    })
    .then((response) => {
      this.setState(Object.assign({open:true, success:true}, response.data));
    })
    .catch((response) => {
      let data = {open: true, success: false}
      if(response.response) {
        data = Object.assign(data, response.response.data);
      } else {
        data.message = response.message;
      }
      this.setState(data);
    });
  };

  onChange = (e) => {
    this.setState({
      [e.target.id]: e.target.value
    });
  }

  render() {
    const { classes } = this.props;
    const { open, message, success } = this.state;

    return (
      <MuiThemeProvider theme={theme}>
        <div className={classes.root}>
          <CssBaseline />
          <Dialog open={open} onClose={this.handleClose}>
            <DialogTitle>Verfication results</DialogTitle>
            <DialogContent>
              <DialogContentText>{message}</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button variant="contained" color={success ? 'secondary': 'primary'} onClick={this.handleClose}>
                OK
              </Button>
            </DialogActions>
          </Dialog>
          <Typography variant="display1" gutterBottom>
            Domain ownership tester
          </Typography>
          <Typography variant="subheading" gutterBottom>
            Enter your domain, sign a message with one of your ownership keys and we'll verify ownership. No need to update DNS, deploy marker files or otherwise change production.
          </Typography>

          <Paper className={classes.boxContainer}>
            <div className={classes.box}>
              <form id="verfication-form" onSubmit={this.submit}>
                <TextField margin="normal" id="domain" label="Domain" placeholder="google.com" fullWidth onChange={this.onChange} />
                <TextField margin="normal" id="verification" label="Signed message" placeholder="-----BEGIN PGP SIGNED MESSAGE-----" multiline fullWidth onChange={this.onChange} />

                <Button variant="raised" type="submit" color="secondary" onClick={this.submit}>
                  Verify ownership
                </Button>
              </form>
            </div>
          </Paper>
        </div>
      </MuiThemeProvider>
    );
  }
}

const App = withStyles(styles)(Index);

ReactDOM.render(<App />, document.getElementById('root'));