if(!localStorage.getItem("token")){
    location.href="/index.html";
}
const messageBox=document.getElementById("message");
const message={
    _timer:null,
    get textContent() {return messageBox.textContent;},
    set textContent(text) {
        messageBox.textContent=text;
        clearTimeout(this._timer);
        if(text!=="") {
            this._timer=setTimeout(function() {messageBox.textContent=""; },5000);
        }
    }
};
document.getElementById("change-pass-btn").addEventListener("click",function(){
	location.href="/change.html";
});
document.getElementById("delete-account-btn").addEventListener("click",function(){
	location.href="/delete-account.html";
});
document.getElementById("logout-btn").addEventListener("click",function(){
    clearSession();
    location.href="/index.html";
    fetch("/api/logout",{method:"POST",headers:{"Authorization":"Bearer "+token}}).then(done,done);
});