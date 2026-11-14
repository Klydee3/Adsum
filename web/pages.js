// Объединённые скрипты страниц. Каждый бывший файл вставлен без изменений кода
// в отдельную функцию, которая запускается только на своей странице.
// Общий код (шапка, меню, clearSession, two) по-прежнему лежит в layout.js.
const pageScripts={};

// ===== admin.js (admin.html) =====
pageScripts["admin.html"]=function() {
	if(!localStorage.getItem("token")||localStorage.getItem("role")!=="ADMIN"){
	    location.href="/index.html";
	}
};

// ===== app.js (app.html) =====
pageScripts["app.html"]=function() {
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
	function homeFor(role) {
	    if(role==="STUDENT") {return "/student.html";}
	    if(role==="TEACHER") {return "/teacher.html";}
		if(role==="CAFETERIA") {return "/cafeteria.html";}
		if(role==="ADMIN"){return "/admin.html";}
	    return "/developer.html";
	}
	const token=localStorage.getItem("token");
	const role=localStorage.getItem("role");
	if(token&&role) {
	    location.href=homeFor(role);
	}
	document.getElementById("to-reg-btn").addEventListener("click",function() {
	    location.href="/reg-page.html";
	});
	document.getElementById("login-btn").addEventListener("click",function() {
	    const login=document.getElementById("login-input").value.trim();
	    const password=document.getElementById("password-input").value.trim();
	    if(login===""||password==="") {
	        message.textContent="Введите логин и пароль";
	        return;
	    }
	    fetch("/api/login", {
	        method:"POST",
	        headers:{"Content-Type":"application/x-www-form-urlencoded"},
	        body:"login="+encodeURIComponent(login)+"&password="+encodeURIComponent(password)
	    })
	    .then(function(r) {return r.json();})
	    .then(function(data) {
	        if(data.result==="ok") {
	            localStorage.setItem("token",data.token);
	            localStorage.setItem("role",data.role);
				localStorage.setItem("school",data.school);
				localStorage.setItem("login",data.login);
	            location.href=homeFor(data.role);
	        }else{
	            message.textContent="Ошибка: "+data.message;
	        }
	    })
	    .catch(function() {message.textContent="Сервер недоступен";});
	});
};

// ===== applications.js (applications.html) =====
pageScripts["applications.html"]=function() {
	if(!localStorage.getItem("token")||(localStorage.getItem("role")!=="ADMIN"&&localStorage.getItem("role")!=="MAIN_DEVELOPER")){
	    location.href="/index.html";
	}
	const messageBox=document.getElementById("message");
	const message={
	    _timer:null,
	    get textContent(){return messageBox.textContent;},
	    set textContent(text){
	        messageBox.textContent=text;
	        clearTimeout(this._timer);
	        if(text!==""){
	            this._timer=setTimeout(function(){messageBox.textContent="";},2000);
	        }
	    }
	};
	function loadPendingAccounts(){
	    fetch("/api/pending-accounts",{headers:{"Authorization":"Bearer "+localStorage.getItem("token")}})
	    .then(function(r){return r.json();})
	    .then(function(data){
	        const box=document.getElementById("pending-accounts");
			const role=localStorage.getItem("role");
	        box.textContent="";
	        if(data.result!=="ok"){
	            box.textContent="Ошибка: "+data.message;
	            return;
	        }
	        if(data.rows.length===0){
	            box.textContent="Новых заявок нет";
	            return;
	        }
	        data.rows.forEach(function(row){
	            const div=document.createElement("div");
				div.className="bubble";
				if(row.role=="TEACHER"){
					row.role="Учитель";
				}else if(row.role=="ADMIN"){
					row.role="Администрация";
				}else{
					row.role="Столовая";
				}
	            div.textContent=row.login+" ("+row.role+"); ";
				if(role==="MAIN_DEVELOPER"){
					div.textContent=row.login+" ("+row.role+"; "+row.school+"); ";
				}
	            const btn=document.createElement("button");
	            btn.className="btn";
	            btn.textContent="Подтвердить";
	            btn.addEventListener("click",function(){approveAccount(row.login);});
	            div.appendChild(btn);
	            box.appendChild(div);
	        });
	    })
	    .catch(function(e){
			message.textContent="Сервер недоступен";});
	}
	function approveAccount(login){
	    fetch("/api/approve-account",{
	        method:"POST",
	        headers:{"Content-Type":"application/x-www-form-urlencoded","Authorization":"Bearer "+localStorage.getItem("token")},
	        body:"login="+encodeURIComponent(login)
	    })
	    .then(function(r){return r.json();})
	    .then(function(data) {
	        if(data.result==="ok") {
	            message.textContent="Аккаунт подтверждён.";
	            loadPendingAccounts();
	        } else {
	            message.textContent="Ошибка: "+data.message;
	        }
	    })
	    .catch(function() {message.textContent="Сервер недоступен";});
	}
	document.getElementById("back-btn").addEventListener("click", function() {
	    location.href="/index.html";
	});
	loadPendingAccounts();
};

// ===== assign.js (assign.html) =====
pageScripts["assign.html"]=function() {
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
};

// ===== cafeteria.js (cafeteria.html) =====
pageScripts["cafeteria.html"]=function() {
	if(!localStorage.getItem("token")||localStorage.getItem("role")!=="CAFETERIA"){
	    location.href="/index.html";
	}
};

// ===== change.js (change.html) =====
pageScripts["change.html"]=function() {
	const message=document.getElementById("message");
	const token=localStorage.getItem("token");
	if(!localStorage.getItem("token")) {
		location.href="index.html"
	}
	if(token===null) {
	    location.href="index.html";
	}
	document.getElementById("change-btn").addEventListener("click",function() {
	    const oldPass=document.getElementById("old-pass").value.trim();
	    const newPass=document.getElementById("new-pass").value.trim();
	    if(oldPass===""||newPass==="") {
	        message.textContent="Введите оба пароля";
	        return;
	    }
	    const token=localStorage.getItem("token");
	    fetch("/api/change-password", {
	        method:"POST",
	        headers:{
	            "Content-Type":"application/x-www-form-urlencoded",
	            "Authorization":"Bearer "+token
	        },
	        body:"oldPassword="+encodeURIComponent(oldPass)+"&newPassword="+encodeURIComponent(newPass)
	    })
	        .then(function(r) {return r.json();})
	        .then(function(data) {
	            if (data.result==="ok") {
	                message.textContent="Пароль изменён. Войдите заново.";
	                clearSession();
	                setTimeout(function() {location.href="index.html";},1500);
	            } else {
	                message.textContent="Ошибка: "+data.message;
	            }
	        })
	        .catch(function() {message.textContent="Сервер недоступен";});
	});
	document.getElementById("back-btn").addEventListener("click",function(){
	    location.href="settings.html";
	});
};

// ===== delete-account.js (delete-account.html) =====
pageScripts["delete-account.html"]=function() {
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
};

// ===== developer.js (developer.html) =====
pageScripts["developer.html"]=function() {
	if(!localStorage.getItem("token")||localStorage.getItem("role")!=="MAIN_DEVELOPER"){
	    location.href="/index.html";
	}
};

// ===== main-developer.js (main-developer.html) =====
pageScripts["main-developer.html"]=function() {
	if(!localStorage.getItem("token")||localStorage.getItem("role")!=="MAIN_DEVELOPER"){
	    location.href="/index.html";
	}
};

// ===== reasons.js (reasons.html) =====
pageScripts["reasons.html"]=function() {
	if(!localStorage.getItem("token")||localStorage.getItem("role")==="STUDENT"){
	    location.href="/index.html";
	}
	const date=new URLSearchParams(location.search).get("date")||"";
	fetch("/api/summary?date="+encodeURIComponent(date),{headers:{"Authorization":"Bearer "+localStorage.getItem("token")}})
	.then(function(r){return r.json();})
	.then(function(data){
	    if(data.result!=="ok"){
	        document.getElementById("message").textContent="Ошибка: "+data.message;
	        return;
	    }
	    document.getElementById("reasons-date").textContent="Дата: "+data.date;
	    const box=document.getElementById("reasons-list");
	    box.textContent="";
	    if(!data.absents||data.absents.length===0){
	        box.textContent="Никто не сообщил об отсутствии.";
	        return;
	    }
	    data.absents.forEach(function(a){
	        const div=document.createElement("div");
	        div.className="bubble";
	        div.textContent=a.name+" ("+a.class+") — "+(a.reason===""?"причина не указана":a.reason);
	        box.appendChild(div);
	    });
	})
	.catch(function(){document.getElementById("message").textContent="Сервер недоступен";});
	document.getElementById("back-btn").addEventListener("click",function(){
	    location.href="/summary.html?date="+encodeURIComponent(date);
	});
};

// ===== reg-dev.js (reg-dev.html) =====
pageScripts["reg-dev.html"]=function() {
	if(!localStorage.getItem("token")||localStorage.getItem("role")!=="MAIN_DEVELOPER"){//if(!localStorage.getItem("token")||(localStorage.getItem("role")!=="MAIN_DEVELOPER"&&localStorage.getItem("role")!=="ADMIN")){ --- If mainDev does not exist
	    location.href="/index.html";
	}
	const messageBox=document.getElementById("message");
	const message={
	    _timer:null,
	    get textContent() {return messageBox.textContent;},
	    set textContent(text) {
	        messageBox.textContent=text;
	        clearTimeout(this._timer);
	        if (text!=="") {
	            this._timer=setTimeout(function() {messageBox.textContent="";},2500);
	        }
	    }
	};
	document.getElementById("regDev").addEventListener("click",function(){
		const name=document.getElementById("devName").value.trim();
		const pass=document.getElementById("devPass").value.trim();
		if(name===null||name===""||pass===null||pass===""){
			message.textContent="Пожалуйста, введите имя и пароль!";
			return;
		}
		fetch("/api/reg-dev",{
			method:"POST",
			headers:{"Content-Type":"application/x-www-form-urlencoded",
			"Authorization":"Bearer "+localStorage.getItem("token")},
			body:"name="+encodeURIComponent(name)+
				"&pass="+encodeURIComponent(pass)
		})
			.then(function(r){return r.json();})
			.then(function(data){
				if(data.result==="ok"){
					message.textContent=data.message;
				}else{
					message.textContent="Ошибка: "+data.message;
				}
			})
			.catch(function(){message.textContent="Сервер недоступен";});
	});
};

// ===== reg-page.js (reg-page.html) =====
pageScripts["reg-page.html"]=function() {
	const messageBox=document.getElementById("message");
	const message={
	    _timer:null,
	    get textContent() {return messageBox.textContent;},
	    set textContent(text) {
	        messageBox.textContent=text;
	        clearTimeout(this._timer);
	        if (text!=="") {
	            this._timer=setTimeout(function() {messageBox.textContent="";},2500);
	        }
	    }
	};
	document.getElementById("back-btn").addEventListener("click",function(){
		location.href="/index.html";
	});
	document.getElementById("register-btn").addEventListener("click",function() {
		const surname=document.getElementById("register-surname").value.trim();
	    const name=document.getElementById("register-name").value.trim();
		const password=document.getElementById("register-password-input").value.trim(); 
		const passwordRepeat=document.getElementById("register-password-input-repeat").value.trim();
		const role=document.getElementById("role").value.trim();
		const school=document.getElementById("register-school").value.trim();
		if (school==="") {
	        message.textContent="Введите название школы!";
	        return;
	    }
		if (surname===""||name==="") {
	        message.textContent="Введите фамилию и имя!";
	        return;
	    }
		if (password.length<8) {
			message.textContent="Пароль не короче 8 символов!";
			return;
		}
		if (password!==passwordRepeat) {
			message.textContent="Пароли не совпадают!";
			return;
		}
		fetch("/api/teacher-n-admin-register",{
	        method:"POST",
	        headers:{"Content-Type":"application/x-www-form-urlencoded"},
	        body:"surname="+encodeURIComponent(surname)+
				"&name="+encodeURIComponent(name)+
				"&password="+encodeURIComponent(password)+
				"&role="+encodeURIComponent(role)+
				"&school="+encodeURIComponent(school)
	    })
	        .then(function(r) {return r.json();})
	        .then(function(data) {
	            if (data.result==="ok") {
	                message.textContent=data.message;
					setTimeout(function() {location.href="/index.html";},2000);
	            } else {
	                message.textContent="Ошибка: "+data.message;
	            }
	        })
	        .catch(function(){message.textContent="Сервер недоступен";});
	});
	fetch("/api/schools")
	    .then(function(r) {return r.json();})
	    .then(function(d) {
	        const list=document.getElementById("schools");
	        (d.schools||[]).forEach(function(name) {
	            const o=document.createElement("option");
	            o.value=name;
	            list.appendChild(o);
	        });
	    })
	    .catch(function() {});
};

// ===== register-student.js (register-student.html) =====
pageScripts["register-student.html"]=function() {
	if(!localStorage.getItem("token")||(localStorage.getItem("role")!=="ADMIN"&&localStorage.getItem("role")!=="MAIN_DEVELOPER")){
	    location.href="/index.html";
	}
	const messageBox=document.getElementById("message");
	const message={
	    _timer:null,
	    get textContent(){return messageBox.textContent;},
	    set textContent(text){
	        messageBox.textContent=text;
	        clearTimeout(this._timer);
	        if(text!==""){
	            this._timer=setTimeout(function(){messageBox.textContent="";},2000);
	        }
	    }
	};
	document.getElementById("back-btn").addEventListener("click",function(){location.href="/index.html";});
	document.getElementById("reg-student-btn").addEventListener("click",function(){
	    const surname=document.getElementById("reg-surname").value.trim();
	    const name=document.getElementById("reg-name").value.trim();
	    const className=document.getElementById("reg-class").value.trim();
	    if(surname===""||name===""||className===""){
	        message.textContent="Нужны фамилия, имя и класс";
	        return;
	    }
	    fetch("/api/register",{
	        method:"POST",
	        headers:{"Content-Type":"application/x-www-form-urlencoded","Authorization":"Bearer "+localStorage.getItem("token")},
	        body:"surname="+encodeURIComponent(surname)+
			"&name="+encodeURIComponent(name)+
			"&className="+encodeURIComponent(className)+
			"&school="+encodeURIComponent(document.getElementById("reg-school").value.trim())
	    })
	    .then(function(r){return r.json();})
	    .then(function(data){
	        if(data.result==="ok"){
	            message.textContent="Ученик зарегистрирован: "+data.name;
	            document.getElementById("reg-surname").value="";
	            document.getElementById("reg-name").value="";
	            document.getElementById("reg-class").value="";
	        }else{
	            message.textContent="Ошибка: "+data.message;
	        }
	    })
	    .catch(function(){message.textContent="Сервер недоступен";});
	});
	if(localStorage.getItem("role")==="MAIN_DEVELOPER"){
	    document.getElementById("reg-school").style.display="";
	    fetch("/api/schools")
	    .then(function(r){return r.json();})
	    .then(function(d){
	        const list=document.getElementById("schools");
	        (d.schools||[]).forEach(function(name){
	            const o=document.createElement("option");
	            o.value=name;
	            list.appendChild(o);
	        });
	    })
	    .catch(function(){});
	}
};

// ===== set-school-menu.js (set-school-menu.html) =====
pageScripts["set-school-menu.html"]=function() {
	const role=localStorage.getItem("role");
	if(!localStorage.getItem("token")||(role!=="CAFETERIA"&&role!=="MAIN_DEVELOPER")){
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
	const token=localStorage.getItem("token");
	const authHeader={"Authorization":"Bearer "+token};
	const postHeaders={"Content-Type":"application/x-www-form-urlencoded","Authorization":"Bearer "+token};
	const schoolSelect=document.getElementById("school-select");
	const dateInput=document.getElementById("menu-date");
	const listBox=document.getElementById("complex-list");
	let complexes=[];
	function schoolParam() {
	    return role==="MAIN_DEVELOPER"?"&school="+encodeURIComponent(schoolSelect.value):"";
	}
	function tomorrow() {
	    const d=new Date();
	    d.setDate(d.getDate()+1);
	    return d.getFullYear()+"-"+two(d.getMonth()+1)+"-"+two(d.getDate());
	}
	function renderComplexes(checked) {
	    listBox.textContent="";
	    if(complexes.length===0) {
	        const p=document.createElement("p");
	        p.textContent="Комплексов пока нет. Добавьте первый выше.";
	        listBox.appendChild(p);
	        return;
	    }
	    complexes.forEach(function(c) {
	        const row=document.createElement("div");
	        row.className="complex-row";
	        const cb=document.createElement("input");
	        cb.type="checkbox";
	        cb.value=c.id;
	        cb.checked=checked.indexOf(c.id)>=0;
	        const info=document.createElement("div");
	        info.className="complex-info";
	        const title=document.createElement("strong");
	        title.textContent=c.name;
	        const dishes=document.createElement("div");
	        dishes.textContent=c.dishes.join(", ");
	        info.appendChild(title);
	        info.appendChild(dishes);
	        const del=document.createElement("button");
	        del.className="btn";
	        del.textContent="Удалить";
	        del.addEventListener("click",function() {
	            if(!confirm("Удалить комплекс «"+c.name+"»?")) {return;}
	            fetch("/api/complex-delete",{method:"POST",headers:postHeaders,
	                body:"id="+c.id+schoolParam()})
	            .then(function(r) {return r.json();})
	            .then(function(d) {
	                if(d.result==="ok") {
	                    message.textContent="Комплекс удалён";
	                    loadAll();
	                } else {
	                    message.textContent=d.message||"Ошибка";
	                }
	            })
	            .catch(function() {message.textContent="Ошибка соединения";});
	        });
	        row.appendChild(cb);
	        row.appendChild(info);
	        row.appendChild(del);
	        listBox.appendChild(row);
	    });
	}
	function checkedIds() {
	    return Array.prototype.map.call(listBox.querySelectorAll("input[type=checkbox]:checked"),function(cb) {
	        return parseInt(cb.value,10);
	    });
	}
	function loadAll() {
	    if(role==="MAIN_DEVELOPER"&&schoolSelect.value==="") {
	        return;
	    }
	    const q="?date="+encodeURIComponent(dateInput.value)+schoolParam();
	    Promise.all([
	        fetch("/api/complexes"+(role==="MAIN_DEVELOPER"?"?school="+encodeURIComponent(schoolSelect.value):""),{headers:authHeader}).then(function(r) {return r.json();}),
	        fetch("/api/menu"+q,{headers:authHeader}).then(function(r) {return r.json();})
	    ]).then(function(res) {
	        if(res[0].result!=="ok") {
	            message.textContent=res[0].message||"Ошибка";
	            return;
	        }
	        complexes=res[0].complexes;
	        const chosen=res[1].result==="ok"?res[1].complexes.map(function(c) {return c.id;}):[];
	        renderComplexes(chosen);
	    })
	    .catch(function() {message.textContent="Ошибка соединения";});
	}
	dateInput.value=tomorrow();
	dateInput.addEventListener("change",loadAll);
	schoolSelect.addEventListener("change",loadAll);
	document.getElementById("add-complex-btn").addEventListener("click",function() {
	    const name=document.getElementById("complex-name").value.trim();
	    const dishes=document.getElementById("complex-dishes").value;
	    if(name===""||dishes.trim()==="") {
	        message.textContent="Введите название и хотя бы одно блюдо";
	        return;
	    }
	    fetch("/api/complex-save",{method:"POST",headers:postHeaders,
	        body:"name="+encodeURIComponent(name)+"&dishes="+encodeURIComponent(dishes)+schoolParam()})
	    .then(function(r) {return r.json();})
	    .then(function(d) {
	        if(d.result==="ok") {
	            message.textContent="Комплекс добавлен";
	            document.getElementById("complex-name").value="";
	            document.getElementById("complex-dishes").value="";
	            const keep=checkedIds();
	            fetch("/api/complexes"+(role==="MAIN_DEVELOPER"?"?school="+encodeURIComponent(schoolSelect.value):""),{headers:authHeader})
	            .then(function(r) {return r.json();})
	            .then(function(x) {
	                if(x.result==="ok") {
	                    complexes=x.complexes;
	                    renderComplexes(keep);
	                }
	            });
	        } else {
	            message.textContent=d.message||"Ошибка";
	        }
	    })
	    .catch(function() {message.textContent="Ошибка соединения";});
	});
	document.getElementById("save-menu-btn").addEventListener("click",function() {
	    if(dateInput.value==="") {
	        message.textContent="Выберите дату";
	        return;
	    }
	    fetch("/api/menu-set",{method:"POST",headers:postHeaders,
	        body:"date="+encodeURIComponent(dateInput.value)+"&ids="+checkedIds().join(",")+schoolParam()})
	    .then(function(r) {return r.json();})
	    .then(function(d) {
	        message.textContent=d.result==="ok"?"Меню на "+dateInput.value+" сохранено":(d.message||"Ошибка");
	    })
	    .catch(function() {message.textContent="Ошибка соединения";});
	});
	document.getElementById("back-btn").addEventListener("click",function(){
	    location.href=role==="MAIN_DEVELOPER"?"/developer.html":"/cafeteria.html";
	});
	if(role==="MAIN_DEVELOPER") {
	    document.getElementById("school-box").style.display="";
	    fetch("/api/schools").then(function(r) {return r.json();}).then(function(d) {
	        (d.schools||[]).forEach(function(name) {
	            const o=document.createElement("option");
	            o.value=name;
	            o.textContent=name;
	            schoolSelect.appendChild(o);
	        });
	        loadAll();
	    });
	} else {
	    loadAll();
	}
};

// ===== menu.js (menu.html) =====
pageScripts["menu.html"]=function() {
	const token=localStorage.getItem("token");
	if(!token){
	    location.href="/index.html";
	    return;
	}
	const role=localStorage.getItem("role");
	const messageBox=document.getElementById("message");
	const view=document.getElementById("menu-view");
	const dateInput=document.getElementById("menu-date");
	const schoolSelect=document.getElementById("school-select");
	const now=new Date();
	dateInput.value=now.getFullYear()+"-"+two(now.getMonth()+1)+"-"+two(now.getDate());
	function show() {
	    view.textContent="";
	    messageBox.textContent="";
	    let url="/api/menu?date="+encodeURIComponent(dateInput.value);
	    if(role==="MAIN_DEVELOPER") {
	        url+="&school="+encodeURIComponent(schoolSelect.value);
	    }
	    fetch(url,{headers:{"Authorization":"Bearer "+token}})
	    .then(function(r) {return r.json();})
	    .then(function(d) {
	        if(d.result!=="ok") {
	            messageBox.textContent=d.message||"Ошибка";
	            return;
	        }
	        if(d.complexes.length===0) {
	            messageBox.textContent="На этот день меню не установлено";
	            return;
	        }
	        d.complexes.forEach(function(c) {
	            const box=document.createElement("div");
	            box.className="bubble wide";
	            const h=document.createElement("h3");
	            h.textContent=c.name;
	            const ul=document.createElement("ul");
	            c.dishes.forEach(function(dish) {
	                const li=document.createElement("li");
	                li.textContent=dish;
	                ul.appendChild(li);
	            });
	            box.appendChild(h);
	            box.appendChild(ul);
	            view.appendChild(box);
	        });
	    })
	    .catch(function() {messageBox.textContent="Ошибка соединения";});
	}
	document.getElementById("show-btn").addEventListener("click",show);
	document.getElementById("back-btn").addEventListener("click",function() {
	    location.href="/index.html";
	});
	if(role==="MAIN_DEVELOPER") {
	    document.getElementById("school-box").style.display="";
	    fetch("/api/schools").then(function(r) {return r.json();}).then(function(d) {
	        (d.schools||[]).forEach(function(name) {
	            const o=document.createElement("option");
	            o.value=name;
	            o.textContent=name;
	            schoolSelect.appendChild(o);
	        });
	        show();
	    });
	} else {
	    show();
	}
};

// ===== settings.js (settings.html) =====
pageScripts["settings.html"]=function() {
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
};

// ===== student-list.js (student-list.html) =====
pageScripts["student-list.html"]=function() {
	const message=document.getElementById("message");
	const token=localStorage.getItem("token");
	const role=localStorage.getItem("role");
	if(!localStorage.getItem("token")) {
		location.href="index.html"
	}
	if(token===null||(role!=="ADMIN"&&role!=="MAIN_DEVELOPER")) {
	    location.href="index.html";
	}
	function loadAll() {
	    fetch("/api/students",{headers:{"Authorization":"Bearer "+token}})
	    .then(function(r) {return r.json();})
	    .then(function(students) {
	        if(!Array.isArray(students)) {
	            message.textContent="Ошибка: "+(students.message||"не удалось загрузить список");
	            return;
	        }
	        const list=document.getElementById("all-list");
	        list.textContent=students.length===0?"Учеников пока нет.":"";
	        students.forEach(function(s) {
	            const row=document.createElement("div");
	            row.className="pending-row";
	            const label=document.createElement("span");
				label.className="bubble";
				label.textContent=s.surname+" "+s.name+"("+s["class"]+" класс)";
	            const delBtn=document.createElement("button");
	            delBtn.className="btn btn-no";
	            delBtn.textContent="Удалить";
	            delBtn.addEventListener("click",function() {removeStudent(s);});
	            label.appendChild(delBtn);
	            row.appendChild(label);
	            list.appendChild(row);
	        });
	    })
	    .catch(function() {message.textContent="Сервер не доступен";});
	}
	function removeStudent(student) {
	    if(!confirm("Удалить ученика «"+student.surname+" "+student.name+"»? Аккаунт будет удалён без возможности восстановления.")) {
	        return;
	    }
	    fetch("/api/delete-student?name="+encodeURIComponent(student.name)+"&surname="+encodeURIComponent(student.surname),
	    {method:"POST",
		headers:{"Authorization":"Bearer "+token}})
	    .then(function(r){return r.json();})
	    .then(function(data) {
	        if(data.result==="ok") {
	            message.textContent="Ученик удален.";
	            setTimeout(function(){message.textContent="";},2000)
	            loadAll();
	        } else {
	            message.textContent="Ошибка: "+data.message;
	        }
	    })
	    .catch(function(e) {console.error(e); message.textContent="Сервер не доступен";});
	}
	document.getElementById("back-btn").addEventListener("click",function() {
	    location.href="index.html";
	});
	loadAll();
};

// ===== student.js (student.html) =====
pageScripts["student.html"]=function() {
	if(!localStorage.getItem("token")||localStorage.getItem("role")!=="STUDENT"){
	    location.href="/index.html";
	}
	const messageBox=document.getElementById("message");
	const message={
	    _timer:null,
	    get textContent(){return messageBox.textContent;},
	    set textContent(text){
	        messageBox.textContent=text;
	        clearTimeout(this._timer);
	        if(text!==""){
	            this._timer=setTimeout(function(){messageBox.textContent="";},5000);
	        }
	    }
	};
	function attend(answer,reason){
	    fetch("/api/attend",{
	        method:"POST",
	        headers:{"Content-Type":"application/x-www-form-urlencoded","Authorization":"Bearer "+localStorage.getItem("token")},
	        body:"answer="+encodeURIComponent(answer)+"&reason="+encodeURIComponent(reason)
	    })
	    .then(function(r){return r.json();})
	    .then(function(data){
	        if(data.result==="ok"){
	            message.textContent="Отметка сохранена.";
	            document.getElementById("btn-yes").disabled=true;
	            document.getElementById("btn-no").disabled=true;
	        }else{
	            message.textContent=data.message;
	        }
	    })
	    .catch(function(){message.textContent="Сервер недоступен";});
	}
	document.getElementById("btn-yes").addEventListener("click",function(){attend("yes","");});
	document.getElementById("btn-no").addEventListener("click",function(){
		const reason=document.getElementById("reason-input").value.trim();
		if(reason==="") {
			message.textContent="Нужно обязательно ввести причину отсутствия!";
			return;
		}
		attend("no",reason);
	});
};

// ===== summary.js (summary.html) =====
pageScripts["summary.html"]=function() {
	const messageBox=document.getElementById("message");
	const message={
	    _timer:null,
	    get textContent(){return messageBox.textContent;},
	    set textContent(text) {
	        messageBox.textContent=text;
	        clearTimeout(this._timer);
	        if (text!==""){
	            this._timer=setTimeout(function() {messageBox.textContent="";},2500);
	        }
	    }
	};
	const token=localStorage.getItem("token");
	const role=localStorage.getItem("role");
	if(!localStorage.getItem("token")) {
		location.href="index.html"
	}
	if (!token||role==="STUDENT") {
	    location.href="/index.html";
	}
	function two(n) {return n<10?"0"+n:""+n;}
	const now=new Date();
	const dateInput=document.getElementById("summary-date");
	dateInput.value=new URLSearchParams(location.search).get("date")||now.getFullYear()+"-"+two(now.getMonth()+1)+"-"+two(now.getDate());
	let lastData=null;
	function loadSummary() {
	    fetch("/api/summary?date="+dateInput.value, {
	        headers:{"Authorization":"Bearer "+token}
	    })
	        .then(function(r) {return r.json();})
	        .then(function(data) {
	            if (data.result!=="ok") {
	                message.textContent="Ошибка: "+data.message;
	                return;
	            }
	            lastData=data;
	            const tbody=document.querySelector("#summary-table tbody");
	            tbody.textContent="";
	            data.rows.forEach(function(row) {
	                const tr=document.createElement("tr");
	                [row["class"],row.total,row.present,row.absent,row.silent,row.percent+"%"].forEach(function(v) {
	                    const td=document.createElement("td");
	                    td.textContent=v;
	                    tr.appendChild(td);
	                });
	                tbody.appendChild(tr);
	            });
	            document.getElementById("summary-total").textContent=
	                "В школу пришло "+data.presentAll+" из "+data.totalAll;
	        })
	        .catch(function() {message.textContent="Сервер недоступен";});
	}
	document.getElementById("show-btn").addEventListener("click",loadSummary);
	document.getElementById("csv-btn").addEventListener("click",function() {
	    if (!lastData) {
	        message.textContent="Сначала покажите сводку";
	        return;
	    }
	    let csv="Класс;Всего;Пришло;Не пришло;Не отметилось;Процент\n";
	    lastData.rows.forEach(function(row) {
	        csv+=row["class"]+";"+row.total+";"+row.present+";"+
	            row.absent+";"+row.silent+";"+row.percent+"\n";
	    });
		let absentAll=0,silentAll=0;
		lastData.rows.forEach(function(r){absentAll+=r.absent;silentAll+=r.silent;})
	    const percentAll=lastData.totalAll>0
	        ?Math.round(lastData.presentAll*100/lastData.totalAll):0;
	    csv+="По школе;"+lastData.totalAll+";"+lastData.presentAll+";"+
	        absentAll+";"+silentAll+";"+percentAll+"\n";
	    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
	    const a=document.createElement("a");
	    a.href=URL.createObjectURL(blob);
	    a.download="summary-"+lastData.date+".csv";
	    a.click();
	});
	document.getElementById("back-btn").addEventListener("click",function() {
	    location.href="/index.html";
	});
	document.getElementById("reasons-btn").addEventListener("click",function() {
	    location.href="/reasons.html?date="+dateInput.value;
	});
	loadSummary();
};

// ===== teacher.js (teacher.html) =====
pageScripts["teacher.html"]=function() {
	if(!localStorage.getItem("token")||localStorage.getItem("role")!=="TEACHER"){
	    location.href="/index.html";
	}
};

// Страница входа называется index.html, а её скрипт лежит под именем app.html
if(!pageScripts["index.html"]) {pageScripts["index.html"]=pageScripts["app.html"];}

const pageName=location.pathname.split("/").pop()||"index.html";
// Все страницы лежат в index.html как <template data-page="имя.html">: вставляем нужную в #app
(function() {
    const app=document.getElementById("app");
    const tpl=document.querySelector('template[data-page="'+pageName+'"]');
    if(!tpl) {
        app.innerHTML='<div class="container"><h1>Страница не найдена</h1><a href="/index.html">На главную</a></div>';
        document.title="Adsum: страница не найдена";
        return;
    }
    document.title=tpl.getAttribute("data-title");
    app.appendChild(tpl.content.cloneNode(true));
})();
if(pageScripts[pageName]) {
    pageScripts[pageName]();
}
