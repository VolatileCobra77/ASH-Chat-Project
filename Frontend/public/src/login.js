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

if (response.status === 200) {
    const data = await response.json();// Parse the response body as JSON
    localStorage.setItem("token", data["token"]);
    localStorage.setItem("username", data["username"]);
    console.log(data);
    console.log(data.username)
    console.log(data.token)
    window.location.href = "/chat";
} else {
    console.error(response.status);
    const errorData = await response.json();  // Optionally parse the error response
    console.error(errorData);
}
})
document.getElementById("signupForm").addEventListener("submit", async (event)=>{
    event.preventDefault()
    let email = document.getElementById("email-signup").value
    let password = document.getElementById("passwd-signup").value
    let username = document.getElementById("uname").value
    
    const data = await fetch("/api/signup",{
        "method":"POST",
        "headers":{
            "Content-Type":"application/json"
        },
        "body":JSON.stringify({"username":username, "email":email, "password":password})
    })
    const jsonData = await data.json()
    if (data.status == 201){
        localStorage.setItem("token", jsonData.token)
        localStorage.setItem("username", jsonData.username)
        window.location.href="/chat"
    }else{
        console.error(data)
    }


})
