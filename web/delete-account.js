const message=document.getElementById("message");
const token=localStorage.getItem("token");
if(!token){
    location.href="/index.html";
}
document.getElementById("delete-btn").addEventListener("click",function(){
    const password=document.getElementById("password-input").value;
    if(password===""){
        message.textContent="Введите пароль для подтверждения";
        return;
    }
    if(!confirm("Точно удалить аккаунт? Это действие нельзя отменить.")){
        return;
    }
    fetch("/api/delete-account",{
        method:"POST",
        headers:{"Content-Type":"application/x-www-form-urlencoded","Authorization":"Bearer "+token},
        body:"password="+encodeURIComponent(password)
    })
    .then(function(r){return r.json();})
    .then(function(data){
        if(data.result==="ok"){
            message.textContent="Аккаунт удалён.";
            clearSession();
            setTimeout(function(){location.href="/index.html";},1500);
        }else{
            message.textContent="Ошибка: "+data.message;
        }
    })
    .catch(function(){message.textContent="Сервер недоступен";});
});
document.getElementById("back-btn").addEventListener("click",function(){
    location.href="/settings.html";
});
