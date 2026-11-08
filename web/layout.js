function two(n) {return n<10?"0"+n:""+n;}
function clearSession() {
    ["token","role","school","login"].forEach(function(k) {localStorage.removeItem(k);});
}
(function() {
    const origFetch=window.fetch;
    window.fetch=function() {
        return origFetch.apply(this,arguments).then(function(resp) {
            if (resp.status===401&&localStorage.getItem("token")) {
                clearSession();
                location.href="/index.html";
            }
            return resp;
        });
    };
})();
(function() {
    const token=localStorage.getItem("token");
    const role=localStorage.getItem("role");
    const now=new Date();
    const months=["января","февраля","марта","апреля","мая","июня",
                    "июля","августа","сентября","октября","ноября","декабря"];
    const hour=now.getHours();
    const greet=hour<6?"Доброй ночи!"
              :hour<12?"Доброе утро!"
              :hour<18?"Добрый день!":"Добрый вечер!";
    const header=document.createElement("div");
    header.id="greet-header";
	setInterval(function() {
		const n=new Date();
		const t=document.getElementById("greet-time");
		if (t) {
			t.textContent=two(n.getHours())+":"+two(n.getMinutes());
		}
	}, 1000);
    header.innerHTML=
    '<span class="greet-date">'+now.getDate()+" "+
    months[now.getMonth()]+" "+now.getFullYear()+
    ', <span id="greet-time">'+two(hour)+":"+two(now.getMinutes())+"</span></span>"+
    '<span class="greet-text">'+greet+"</span>";
	const rail=document.createElement("div");
	rail.id="side-rail";
	rail.innerHTML=
		(token
			?'<button class="side-icon" id="rail-person" title="Кабинет">☺</button>' +
			 '<button class="side-icon" id="rail-tools" title="Инструменты">☰</button>' +
			 '<button class="side-icon" id="rail-gear" title="Настройки">⚙</button>'
			:'') 
    const panel=document.createElement("div");
    panel.id="side-panel";
    let links="";
    if (!token){
        links+='<a href="/index.html">Вход</a>';
        links+='<a href="/reg-page.html">Регистрация</a>';
    }else{
		if(role==="MAIN_DEVELOPER"){
			links+='<a href="/student-list.html">Список учеников</a>';
			links+='<a href="/register-student.html">Регистрация ученика</a>';
			links+='<a href="/applications.html">Заявки на аккаунты</a>';
			links+='<a href="/assign.html">Классные руководители</a>';
			links+='<a href="/reg-dev.html">Зарегистрировать Разработчика</a>';
			links+='<a href="/summary.html">Утренняя сводка</a>';
			links+='<a href="/set-school-menu.html">Установить школьное меню</a>';
		}
        if (role==="ADMIN") {
			links+='<a href="/student-list.html">Список учеников</a>';
			links+='<a href="/register-student.html">Регистрация ученика</a>';
			links+='<a href="/applications.html">Заявки на аккаунты</a>';
			links+='<a href="/assign.html">Классные руководители</a>';
		}
        if (role==="ADMIN"||role==="TEACHER"||role==="CAFETERIA") {
            links+='<a href="/summary.html">Утренняя сводка</a>';
        }
		if (role==="CAFETERIA") {
            links+='<a href="/set-school-menu.html">Установить школьное меню</a>';
        }
    }
    panel.innerHTML=links;
    document.body.insertBefore(header,document.body.firstChild);
    document.body.insertBefore(rail,document.body.firstChild);
    document.body.insertBefore(panel,document.body.firstChild);
    function closePanel() {
        panel.classList.remove("open");
    }
   const toolsBtn=document.getElementById("rail-tools");
	if(toolsBtn){
		toolsBtn.addEventListener("click",function(){
			panel.classList.toggle("open");
		});
	}
	const personBtn=document.getElementById("rail-person");
	if(personBtn){
		personBtn.addEventListener("click",function(){
			closePanel();
			location.href="/index.html";
		});
	}
	document.getElementById("rail-gear").addEventListener("click",function(){
		closePanel();
		location.href=token?"/settings.html":"/index.html";
	});
    document.addEventListener("click",function(e) {
        if (!panel.classList.contains("open")) {
            return;
        }
        if (panel.contains(e.target)||rail.contains(e.target)) {
            return;
        }
        closePanel();
    });
    const logout=document.getElementById("side-logout");
    if (logout) {
        logout.addEventListener("click",function(e) {
            e.preventDefault();
            const done=function() {
                clearSession();
                location.href="/index.html";
            };
            fetch("/api/logout",{method:"POST",headers:{"Authorization":"Bearer "+token}}).then(done,done);
        });
    }
})();
(function() {
    const token=localStorage.getItem("token");
    if (!token) {
        return;
    }
    fetch("/api/me",{headers:{"Authorization":"Bearer "+token}})
    .then(function(r) {return r.json();})
    .then(function(d) {
        if (d.result==="ok") {
            localStorage.setItem("role",d.role);
            localStorage.setItem("school",d.school);
            localStorage.setItem("login",d.login);
        }
    })
    .catch(function() {});
})();
