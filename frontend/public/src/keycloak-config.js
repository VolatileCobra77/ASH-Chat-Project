const keycloakConfig = {
    url: 'http://localhost:8080',  // Your Keycloak server URL
    realm: 'your-realm',           // Your realm name
    clientId: 'your-client-id'     // Your client ID
};

const keycloak = new Keycloak(keycloakConfig); 