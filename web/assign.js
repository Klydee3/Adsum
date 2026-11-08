if(!localStorage.getItem("token")||(localStorage.getItem("role")!=="ADMIN"&&localStorage.getItem("role")!=="MAIN_DEVELOPER")){
    location.href="/index.html";
}
function loadTeachers(){
    fetch("/api/teachers-list",{headers:{"Authorization":"Bearer "+localStorage.getItem("token")}})
    .then(function(r){return r.json();})
    .then(function(data){
        if(data.result!=="ok"){
            document.getElementById("message").textContent="Ошибка: "+data.message;
            return;
        }
        const box=document.getElementById("teachers-box");
        box.textContent="";
        if(data.teachers.length===0){
            box.textContent="Учителей пока нет.";
            return;
        }
        data.teachers.forEach(function(t){
            const row=document.createElement("div");
            row.className="bubble";
            const input=document.createElement("input");
            input.className="name-input";
            input.placeholder="Класс (1-11)";
            input.value=t.class;
            const btn=document.createElement("button");
            btn.className="btn";
            btn.textContent="Сохранить";
            btn.addEventListener("click",function(){
                fetch("/api/assign-class",{
                    method:"POST",
                    headers:{"Content-Type":"application/x-www-form-urlencoded","Authorization":"Bearer "+localStorage.getItem("token")},
                    body:"teacher="+encodeURIComponent(t.login)+"&class="+encodeURIComponent(input.value)
                })
                .then(function(r){return r.json();})
                .then(function(d){
                    document.getElementById("message").textContent=d.result==="ok"?"Сохранено.":"Ошибка: "+d.message;
                })
                .catch(function(){document.getElementById("message").textContent="Сервер недоступен";});
            });
            const delBtn=document.createElement("button");
            delBtn.className="btn btn-no";
            delBtn.textContent="Удалить учителя";
            delBtn.addEventListener("click",function(){
                if(!confirm("Удалить учителя «"+t.login+"»? Аккаунт будет удалён без возможности восстановления.")){
                    return;
                }
                fetch("/api/delete-teacher",{
                    method:"POST",
                    headers:{"Content-Type":"application/x-www-form-urlencoded","Authorization":"Bearer "+localStorage.getItem("token")},
                    body:"teacher="+encodeURIComponent(t.login)
                })
                .then(function(r){return r.json();})
                .then(function(d){
                    if(d.result==="ok"){
                        document.getElementById("message").textContent="Учитель удалён.";
                        loadTeachers();
                    }else{
                        document.getElementById("message").textContent="Ошибка: "+d.message;
                    }
                })
                .catch(function(){document.getElementById("message").textContent="Сервер недоступен";});
            });
            row.appendChild(document.createTextNode(t.login));
            row.appendChild(input);
            row.appendChild(btn);
			row.appendChild(delBtn);
            box.appendChild(row);
        });
    })
    .catch(function(){document.getElementById("message").textContent="Сервер недоступен";});
}
loadTeachers();
document.getElementById("back-btn").addEventListener("click",function(){
    location.href="/index.html";
});