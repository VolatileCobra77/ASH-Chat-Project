let loginBtn = document.getElementById("loginBtn")
let accountBtn = document.getElementById("accountBtn")
 // Keycloak configuration
 const keycloak = new Keycloak({
    url: 'https://keycloak.mrpickle.ca', // Your Keycloak server URL
    realm: 'mrpickle.ca',              // Your Keycloak realm name
    clientId: 'ChatClient'       // Your Keycloak client Id
  });
  const status = document.getElementById('status');
  const tokenDisplay = document.getElementById('token-display');
  const tokenElement = document.getElementById('token');

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
      window.location.href="/errors/KcAuthError"
    });

  // Show logged-in state
  function showLoggedInState() {
    loginBtn.classList.add("visualy-hidden")
    accountBtn.classList.remove("visualy-hidden");
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
    loginBtn.classList.remove("visualy-hidden")
    accountBtn.classList.add("visualy-hidden")
  }

  // Handle login
  loginBtn.addEventListener('click', () => {
    keycloak.login();
  });



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

const themes = {
    light: {
        bodyBg: '#f5f5f5',
        textColor: '#000',
        chatWindowBg: '#ffffff',
        inputBg: '#ffffff',
        inputTextColor: '#000',
        inputBorderColor: '#ddd',
        buttonBg: '#28a745',
        messageBg: '#f9f9f9',
        timestampColor: '#000',
        ipColor: 'grey'
    },
    dark: {
        bodyBg: '#181818',
        textColor: '#fff',
        chatWindowBg: '#282828',
        inputBg: '#333333',
        inputTextColor: '#fff',
        inputBorderColor: '#444444',
        buttonBg: '#4CAF50',
        messageBg: '#333333',
        timestampColor: '#fff',
        ipColor: '#ccc'
    },
    neon: {
        bodyBg: '#000000',
        textColor: '#39ff14',  // Neon green text
        chatWindowBg: '#1f1f1f',
        inputBg: '#1f1f1f',
        inputTextColor: '#39ff14',
        inputBorderColor: '#39ff14',
        buttonBg: '#ff00ff',  // Neon pink button
        messageBg: '#0f0f0f',
        timestampColor: '#ff00ff', // Neon pink timestamps
        ipColor: '#ff00ff'
    }
};

// Function to apply a theme from the predefined list
function applyTheme(theme) {
    localStorage.setItem("theme", theme)
    localStorage.removeItem("custom-theme")
    document.body.style.backgroundColor = themes[theme].bodyBg;
    document.body.style.color = themes[theme].textColor;

    const chatWindow = document.getElementById('chat-window');
    chatWindow.style.backgroundColor = themes[theme].chatWindowBg;

    const input = document.querySelector('#message-input input');
    input.style.backgroundColor = themes[theme].inputBg;
    input.style.color = themes[theme].inputTextColor;
    input.style.borderColor = themes[theme].inputBorderColor;

    const button = document.querySelector('#message-input button');
    button.style.backgroundColor = themes[theme].buttonBg;

    const messages = document.querySelectorAll('.message');
    messages.forEach(message => {
        message.style.backgroundColor = themes[theme].messageBg;
    });

    const timestamps = document.querySelectorAll('.timestamp');
    timestamps.forEach(timestamp => {
        timestamp.style.color = themes[theme].timestampColor;
    });

    const ips = document.querySelectorAll('.ip');
    ips.forEach(ip => {
        ip.style.color = themes[theme].ipColor;
    });
}

// Function to apply a custom theme using a JSON object
function customTheme(themeObject) {
    localStorage.setItem("theme", "custom")
    localStorage.setItem("custom-theme", JSON.stringify(themeObject))
    document.body.style.backgroundColor = themeObject.bodyBg;
    document.body.style.color = themeObject.textColor;

    const chatWindow = document.getElementById('chat-window');
    chatWindow.style.backgroundColor = themeObject.chatWindowBg;

    const input = document.querySelector('#message-input input');
    input.style.backgroundColor = themeObject.inputBg;
    input.style.color = themeObject.inputTextColor;
    input.style.borderColor = themeObject.inputBorderColor;

    const button = document.querySelector('#message-input button');
    button.style.backgroundColor = themeObject.buttonBg;

    const messages = document.querySelectorAll('.message');
    messages.forEach(message => {
        message.style.backgroundColor = themeObject.messageBg;
    });

    const timestamps = document.querySelectorAll('.timestamp');
    timestamps.forEach(timestamp => {
        timestamp.style.color = themeObject.timestampColor;
    });

    const ips = document.querySelectorAll('.ip');
    ips.forEach(ip => {
        ip.style.color = themeObject.ipColor;
    });
}
let currentTheme = localStorage.getItem("theme")
if (currentTheme =="custom"){
    customTheme(JSON.parse(localStorage.getItem("custom-theme")))
    console.log("applied custom theme")
}else if (currentTheme){
    applyTheme(currentTheme)
    console.log(`applied ${currentTheme}`)
}else{
    console.log('applied light theme')
    applyTheme('light')
}
