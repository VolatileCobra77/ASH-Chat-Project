document.getElementById("loginForm").addEventListener("submit", async (event)=>{
    event.preventDefault()
    let email = document.getElementById("email").value
    let password = document.getElementById("passwd").value
    
const response = await fetch("/api/login", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
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
    window.location.href = "/chat";
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
    
    const data = await fetch("/api/signup",{
        "method":"POST",
        "headers":{
            "Content-Type":"application/json"
        },
        "body":JSON.stringify({"username":username, "email":email, "password":password})
    })
    const jsonData = await data.json()
    if (jsonData.error || response.status ===400){
        addAlert('danger', 'ERROR',jsonData.error)
        return
    }
    if (data.status == 201){
        localStorage.setItem("token", jsonData.token)
        localStorage.setItem("username", jsonData.username)
        window.location.href="/chat"
    }else{
        console.error(data)
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
