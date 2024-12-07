let publicKey = null


/**
 * Encrypts plaintext using the server's RSA public key.
 * @param {string} plaintext - The data to encrypt.
 * @param {string} publicKeyPem - The server's PEM-formatted public key.
 * @returns {Promise<string>} - The Base64-encoded encrypted data.
 */
async function encryptRSA(plaintext, publicKeyPem) {
    try {
        // Convert PEM public key to a format usable by crypto.subtle
        const publicKey = await importPublicKey(publicKeyPem);

        // Encrypt the data
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            {
                name: "RSA-OAEP",
            },
            publicKey,
            new TextEncoder().encode(plaintext) // Convert plaintext to Uint8Array
        );

        // Convert encrypted buffer to Base64
        return btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
    } catch (error) {
        console.error("Encryption Error:", error.message);
        throw new Error("Failed to encrypt the data.");
    }
}

/**
 * Converts a PEM-formatted public key to a CryptoKey usable by crypto.subtle.
 * @param {string} pem - The PEM-formatted public key.
 * @returns {Promise<CryptoKey>} - The CryptoKey object.
 */
async function importPublicKey(pem) {
    // Strip PEM header/footer and decode base64 content
    const keyData = pem
        .replace(/-----BEGIN PUBLIC KEY-----/, "")
        .replace(/-----END PUBLIC KEY-----/, "")
        .replace(/\s+/g, "");
    const binaryDer = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));

    // Import the key
    return window.crypto.subtle.importKey(
        "spki",
        binaryDer.buffer,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        true,
        ["encrypt"]
    );
}


async function getKey(){
    let res = await fetch("/api/encryption/publicKey", {
        "method":"GET",
        headers:{
            "Content-Type":"application/json"
        }
    })
    let resJson = await res.json()
    publicKey = resJson.publicKey
}

document.getElementById("loginForm").addEventListener("submit", async (event)=>{
    event.preventDefault()
    let email = document.getElementById("email").value
    let password = document.getElementById("passwd").value
    
    let encPassword = encryptRSA(password, publicKey)

    console.log(encPassword)

const response = await fetch("/api/login", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ email,  "password":encPassword})
});

const data = await response.json()

if (data.error || response.status ===400){
    addAlert('danger', 'ERROR', data.error)
    return
}

if (response.status === 200) {
    localStorage.setItem("token", data["token"]);
    localStorage.setItem("username", data["username"]);
    console.log(data);
    console.log(data.username)
    console.log(data.token)
    window.location.href = "/";
} else {
    
}
})
document.getElementById("signupForm").addEventListener("submit", async (event)=>{
    event.preventDefault()
    let email = document.getElementById("email-signup").value
    let password = document.getElementById("passwd-signup").value
    let passwordConf = document.getElementById("passwdConf").value
    let username = document.getElementById("uname").value

    if (password !== passwordConf){
        console.log("PASSWORDS DONT MATCH!!!")
        addAlert('danger', 'ERROR', "Passwords do not match!")
        
    }

    let encPassword = encryptRSA(password, publicKey)
    
    const data = await fetch("/api/signup",{
        "method":"POST",
        "headers":{
            "Content-Type":"application/json"
        },
        "body":JSON.stringify({"username":username, "email":email, "password": encPassword})
    }) 
    const jsonData = await data.json()
    if (jsonData.error || response.status ===400){
        addAlert('danger', 'ERROR',jsonData.error)
        return
    }
    if (data.status == 201){
        localStorage.setItem("token", jsonData.token)
        localStorage.setItem("username", jsonData.username)
        window.location.href="/"
    }else{
        console.error(data)
        addAlert('danger', 'ERROR', data)
    }


})

function addAlert(type, heading, content){
    let alertsDiv = document.getElementById("Alerts")
    alertsDiv.innerHTML += `<div class="alert alert-${type} alert-dismissible fade show" role="alert" style="margin-top: 10px; margin-left: 21px; margin-right: 21px; margin-bottom: 0px;">
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            <strong>${heading}</strong> ${content}
        </div>`
    setTimeout(closeAlert, 3000)
}

function closeAlert(name){
    let alertElement = document.querySelector('.alert');
    let bsAlert = new bootstrap.Alert(alertElement);
    bsAlert.close();
    setTimeout(()=>{
        alertElement.remove()
    }, 3000)
}
