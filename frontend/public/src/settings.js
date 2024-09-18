 // Theme switching logic
 function applyLightTheme() {
    applyTheme('light')
}

function applyDarkTheme(){
    applyTheme('dark')
}

// Custom theme logic
function applyCustomTheme()
 {
    console.log("CHANGING HEME")
    const bgColor = document.getElementById('bgColorInput').value;
    const textColor = document.getElementById('textColorInput').value;
    const chatWindowColor = document.getElementById('chatWinColorInput').value
    const inputWindowColor = document.getElementById('inputWinColorInput').value
    const inputTxtColor = document.getElementById('inputTxtColorInput').value
    const inputBorderColor = document.getElementById('inputBorderColorInput').value
    const sendBtnBg = document.getElementById('sendBtnBgInput').value
    const messageBg = document.getElementById('msgBgInput').value
    const timestampColor = document.getElementById('timestampColorInput').value
    const ipColor = document.getElementById('ipColorInput').value

    let theme = {
        bodyBg: bgColor,
        textColor: textColor,
        chatWindowBg: chatWindowColor,
        inputBg: inputWindowColor,
        inputTextColor: inputTxtColor,
        inputBorderColor: inputBorderColor,
        buttonBg: sendBtnBg,
        messageBg: messageBg,
        timestampColor: timestampColor,
        ipColor: ipColor
    }

    customTheme(theme)

    // Close modal after applying theme
    const modal = bootstrap.Modal.getInstance(document.getElementById('customThemeModal'));
    modal.hide();
}

function saveChanges(){
    let pfpUpload = document.getElementById("file-upload")
    let username = document.getElementById("editableText")
    let color = document.getElementById("usrColor")

    const formData = new FormData();
    formData.append('file', pfpUpload.files[0]);

    fetch('/api/chgPfp', {
        method: 'POST',
        headers:{
            "Authorization":`Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        console.log('File successfully uploaded:', data);
      })
      .catch(error => {
        console.error('Error uploading file:', error);
      });
}
async function changePasswordSubmit(){
  let oldPassword = document.getElementById("oldPasswd").value
  let newPassword = document.getElementById("newPasswd").value
  let newPasswordRepeat = document.getElementById("newPasswdRe").value

  if (newPassword !== newPasswordRepeat){
    console.log("Passwords Dont match")
    addAlert("danger", 'ERROR', 'Passwords do not match')
    return
  }
  let serverData = await fetch("/api/chgPasswd", {
    "method":"POST",
    "headers":{
      "Content-Type":"application/json",
      "Authorization":`Bearer ${localStorage.getItem("token")}`
    },
    "body":JSON.stringify({"newPasswd":newPassword, "oldPasswd":oldPassword})
  })
  let serverJson = await serverData.json()
  if (serverData.status == 401){
    addAlert("danger", 'ERROR', serverJson.error)
    return
  }


}