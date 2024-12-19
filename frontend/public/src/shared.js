let loginBtn = document.getElementById("loginBtn")
let accountBtn = document.getElementById("logoutBtn")
 // Keycloak configuration
 const keycloak = new Keycloak({
    url: 'https://keycloak.mrpickle.ca', // Your Keycloak server URL
    realm: 'mrpickle.ca',              // Your Keycloak realm name
    clientId: 'ChatClient'       // Your Keycloak client Id
  });

  // Initialize Keycloak
  keycloak.init({ onLoad: 'check-sso', silentCheckSsoRedirectUri:window.location.origin + '/public/silent-check-sso.html',  pkceMethod: 'S256', checkLoginIframe: true, enableLogging: true, })
    .then(authenticated => {
      keycloak.authenticationSuccess = authenticated
      if (authenticated) {
        showLoggedInState();
      } else {
        showLoggedOutState();
      }
    })
    .catch(err => {
      console.error('Keycloak initialization error:', err);
      addERROR("KEYCLOAK", "error initalizing Keycloak, please try <a href=\"#\" onclick=\"keycloak.logout()\">logging out</a> and <a href=\"#\" onclick=\"keycloak.login()\">logging in</a> again")
    });

  // Show logged-in state
  function showLoggedInState() {
    loginBtn.classList.add("hidden")
    accountBtn.classList.remove("hidden")
    console.log("KEYCLOAK TOKEN" + JSON.stringify(keycloak.tokenParsed,null, 4))

    // Refresh the token periodically
    setInterval(() => {
      keycloak.updateToken(30).catch(() => {
        console.warn('Failed to refresh token');
      });
    }, 30000);
  }

  // Show logged-out state
  function showLoggedOutState() {
    loginBtn.classList.remove("hidden")
    accountBtn.classList.add("hidden")
  }

// Initialize Keycloak when the page loads

function timeAgo(unixTime) {
    const now = Date.now();
    const diffInSeconds = Math.floor((now - unixTime * 1000) / 1000); // Convert milliseconds to seconds
    
    if (diffInSeconds < 60) {
        return `${diffInSeconds} secs ago`;
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} mins ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hrs ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
        return `${diffInDays} days ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `${diffInMonths} months ago`;
    }
    
    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} years ago`;
}