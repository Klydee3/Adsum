// ===== Тема оформления =====
function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme",theme==="light"?"light":"dark");
}
function getTheme() {
    try {return localStorage.getItem("theme")==="light"?"light":"dark";} catch(e) {return "dark";}
}
function setTheme(theme) {
    try {localStorage.setItem("theme",theme);} catch(e) {}
    applyTheme(theme);
}
applyTheme(getTheme());

// ===== Свой выбор даты =====
(function() {
    const MONTHS=["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
    const MONTHS_GEN=["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
    const DOW=["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
    const ICON_CAL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="4"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>';
    const ICON_L='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
    const ICON_R='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
    const pad=function(n) {return n<10?"0"+n:""+n;};
    const iso=function(d) {return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());};
    const parse=function(v) {
        const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||"");
        return m?new Date(+m[1],+m[2]-1,+m[3]):null;
    };
    const pickers=[];
    function build(input) {
        const wrap=document.createElement("div");
        wrap.className="dp";
        input.parentNode.insertBefore(wrap,input);
        wrap.appendChild(input);
        input.tabIndex=-1;
        input.className="";
        const trigger=document.createElement("button");
        trigger.type="button";
        trigger.className="dp-trigger";
        const label=document.createElement("span");
        trigger.innerHTML=ICON_CAL;
        trigger.appendChild(label);
        const pop=document.createElement("div");
        pop.className="dp-pop";
        wrap.appendChild(trigger);
        wrap.appendChild(pop);
        let view=parse(input.value)||new Date();
        view=new Date(view.getFullYear(),view.getMonth(),1);

        function refreshLabel() {
            const d=parse(input.value);
            label.textContent=d?d.getDate()+" "+MONTHS_GEN[d.getMonth()]+" "+d.getFullYear():"Выберите дату";
        }
        function pick(d) {
            input.dataset.raw=iso(d);
            setValue(iso(d));
            input.dispatchEvent(new Event("input",{bubbles:true}));
            input.dispatchEvent(new Event("change",{bubbles:true}));
            close();
        }
        function render() {
            const sel=parse(input.value);
            const today=new Date();
            const first=new Date(view.getFullYear(),view.getMonth(),1);
            const offset=(first.getDay()+6)%7;
            let html='<div class="dp-head"><button type="button" class="dp-nav" data-dir="-1" aria-label="Предыдущий месяц">'+ICON_L+'</button>'+
                '<span class="dp-title">'+MONTHS[view.getMonth()]+" "+view.getFullYear()+'</span>'+
                '<button type="button" class="dp-nav" data-dir="1" aria-label="Следующий месяц">'+ICON_R+'</button></div><div class="dp-grid">';
            DOW.forEach(function(n) {html+='<div class="dp-dow">'+n+"</div>";});
            for (let i=0;i<42;i++) {
                const d=new Date(view.getFullYear(),view.getMonth(),1-offset+i);
                let cls="dp-day";
                if (d.getMonth()!==view.getMonth()) {cls+=" muted";}
                if (iso(d)===iso(today)) {cls+=" today";}
                if (sel&&iso(d)===iso(sel)) {cls+=" selected";}
                html+='<button type="button" class="'+cls+'" data-date="'+iso(d)+'">'+d.getDate()+"</button>";
            }
            html+='</div><div class="dp-foot"><button type="button" class="dp-today">Сегодня</button></div>';
            pop.innerHTML=html;
        }
        function open() {
            pickers.forEach(function(p) {if (p!==api) {p.close();}});
            const d=parse(input.value)||new Date();
            view=new Date(d.getFullYear(),d.getMonth(),1);
            render();
            wrap.classList.add("open");
        }
        function close() {wrap.classList.remove("open");}
        trigger.addEventListener("click",function() {
            wrap.classList.contains("open")?close():open();
        });
        pop.addEventListener("click",function(e) {
            const nav=e.target.closest(".dp-nav");
            const day=e.target.closest(".dp-day");
            if (nav) {
                view=new Date(view.getFullYear(),view.getMonth()+(+nav.dataset.dir),1);
                render();
            } else if (day) {
                pick(parse(day.dataset.date));
            } else if (e.target.closest(".dp-today")) {
                pick(new Date());
            }
        });
        document.addEventListener("click",function(e) {if (!wrap.contains(e.target)) {close();}});
        document.addEventListener("keydown",function(e) {if (e.key==="Escape") {close();}});
		
        const desc=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value");
        function setValue(v) {desc.set.call(input,v);refreshLabel();}
        Object.defineProperty(input,"value",{
            get:function() {return desc.get.call(input);},
            set:setValue,
            configurable:true
        });
        refreshLabel();
        const api={close:close};
        pickers.push(api);
    }
    window.enhanceDatePickers=function(root) {
        (root||document).querySelectorAll('input[type="date"]').forEach(function(i) {
            if (!i.closest(".dp")) {build(i);}
        });
    };
})();

// ===== Свой выбор из списка (школа, роль, предмет) в стиле выбора даты =====
(function() {
    const svg=function(path,w) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(w||2)+'" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
    };
    const ICONS={
        school:svg('<path d="M3 10l9-5 9 5"/><path d="M5 10v8M19 10v8M9 18v-5M15 18v-5M3 20h18"/>'),
        role:svg('<circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5"/>'),
        subject:svg('<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>'),
        "class":svg('<circle cx="9" cy="8" r="3.2"/><path d="M2.8 19c.6-3 3-4.6 6.2-4.6s5.6 1.6 6.2 4.6"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.6c1.8.6 3 2 3.4 4.4"/>')
    };
    const ICON_CHEV='<svg class="sp-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
    const ICON_CHECK=svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>',2.6);
    const SEARCH_FROM=7;
    const pickers=[];
    const norm=function(v) {return (v||"").toLowerCase().replace(/ё/g,"е");};

    function build(el) {
        const isSelect=el.tagName==="SELECT";
        const datalist=isSelect?null:document.getElementById(el.getAttribute("list")||"");
        const isCustom=function() {return el.dataset.custom==="true";};
        const placeholder=el.dataset.placeholder||"Выберите";
        const maxLen=+el.getAttribute("maxlength")||0;
        const labelEl=el.id?document.querySelector('label[for="'+el.id+'"]'):null;

        const wrap=document.createElement("div");
        wrap.className="sp";
        if (el.style.display==="none") {
            wrap.style.display="none";
            el.style.display="";
        }
        el.parentNode.insertBefore(wrap,el);
        wrap.appendChild(el);
        el.tabIndex=-1;
        el.removeAttribute("list");
        el.setAttribute("aria-hidden","true");

        const trigger=document.createElement("button");
        trigger.type="button";
        trigger.className="sp-trigger";
        trigger.setAttribute("aria-haspopup","listbox");
        trigger.setAttribute("aria-expanded","false");
        trigger.setAttribute("aria-label",labelEl?labelEl.textContent.replace(/:$/,""):placeholder);
        trigger.innerHTML=(ICONS[el.dataset.icon]||"")+'<span class="sp-label"></span>'+ICON_CHEV;
        const label=trigger.querySelector(".sp-label");

        const pop=document.createElement("div");
        pop.className="sp-pop";
        const search=document.createElement("input");
        search.type="text";
        search.className="sp-search";
        search.autocomplete="off";
        search.hidden=true;
        const list=document.createElement("div");
        list.className="sp-list";
        list.setAttribute("role","listbox");
        pop.appendChild(search);
        pop.appendChild(list);
        wrap.appendChild(trigger);
        wrap.appendChild(pop);

        function options() {
            if (isSelect) {
                return Array.prototype.map.call(el.options,function(o) {return {value:o.value,label:o.textContent};});
            }
            return datalist?Array.prototype.map.call(datalist.options,function(o) {return {value:o.value,label:o.value};}):[];
        }
        function refreshLabel() {
            let text="";
            if (isSelect) {
                const o=el.options[el.selectedIndex];
                text=o?o.textContent:"";
            } else {
                text=el.value;
            }
            label.textContent=text||placeholder;
            label.classList.toggle("placeholder",text==="");
            trigger.title=text;
        }
        function addRow(cls,value,text,selected) {
            const b=document.createElement("button");
            b.type="button";
            b.className="sp-opt"+cls+(selected?" selected":"");
            b.setAttribute("role","option");
            b.setAttribute("aria-selected",selected?"true":"false");
            b.dataset.value=value;
            const t=document.createElement("span");
            t.textContent=text;
            b.appendChild(t);
            if (selected) {b.insertAdjacentHTML("beforeend",ICON_CHECK);}
            list.appendChild(b);
        }
        function renderList() {
            const typed=search.value.trim();
            const q=norm(typed);
            const all=options();
            const current=el.value;
            list.textContent="";
            all.forEach(function(o) {
                if (q!==""&&norm(o.label).indexOf(q)===-1) {return;}
                addRow("",o.value,o.label,o.value===current);
            });
            if (isCustom()&&typed!==""&&!all.some(function(o) {return norm(o.label)===q;})) {
                addRow(" add",maxLen?typed.slice(0,maxLen):typed,"Добавить «"+typed+"»",false);
            }
            if (list.children.length===0) {
                const empty=document.createElement("div");
                empty.className="sp-empty";
                empty.textContent=all.length===0?"Список пуст":"Ничего не найдено";
                list.appendChild(empty);
            }
        }
        function open() {
            pickers.forEach(function(p) {if (p!==api) {p.close();}});
            search.value="";
            const withSearch=isCustom()||options().length>=SEARCH_FROM;
            search.hidden=!withSearch;
            search.placeholder=isCustom()?"Найти или ввести свой вариант":"Поиск";
            renderList();
            wrap.classList.add("open");
            trigger.setAttribute("aria-expanded","true");
            const sel=list.querySelector(".selected");
            if (sel) {list.scrollTop=sel.offsetTop-(list.clientHeight-sel.offsetHeight)/2;}
            if (withSearch&&window.matchMedia&&window.matchMedia("(hover: hover)").matches) {
                search.focus({preventScroll:true});
            }
        }
        function close() {
            wrap.classList.remove("open");
            trigger.setAttribute("aria-expanded","false");
        }
        function choose(value) {
            const changed=el.value!==value;
            el.value=value;
            if (changed) {
                el.dispatchEvent(new Event("input",{bubbles:true}));
                el.dispatchEvent(new Event("change",{bubbles:true}));
            }
            close();
            trigger.focus({preventScroll:true});
        }

        trigger.addEventListener("click",function() {
            wrap.classList.contains("open")?close():open();
        });
        list.addEventListener("click",function(e) {
            const row=e.target.closest(".sp-opt");
            if (row) {choose(row.dataset.value);}
        });
        search.addEventListener("input",renderList);
        search.addEventListener("keydown",function(e) {
            if (e.key==="Enter") {
                e.preventDefault();
                const first=list.querySelector(".sp-opt");
                if (first) {choose(first.dataset.value);}
            }
        });
        pop.addEventListener("keydown",function(e) {
            if (e.key!=="ArrowDown"&&e.key!=="ArrowUp") {return;}
            const items=Array.prototype.slice.call(pop.querySelectorAll(".sp-search:not([hidden]),.sp-opt"));
            const i=items.indexOf(document.activeElement);
            const next=e.key==="ArrowDown"?Math.min(items.length-1,i+1):Math.max(0,i-1);
            if (items[next]) {
                items[next].focus();
                e.preventDefault();
            }
        });
        document.addEventListener("click",function(e) {if (!wrap.contains(e.target)) {close();}});
        document.addEventListener("keydown",function(e) {
            if (e.key==="Escape"&&wrap.classList.contains("open")) {
                close();
                trigger.focus({preventScroll:true});
            }
        });

        const desc=Object.getOwnPropertyDescriptor(isSelect?HTMLSelectElement.prototype:HTMLInputElement.prototype,"value");
        Object.defineProperty(el,"value",{
            get:function() {return desc.get.call(el);},
            set:function(v) {desc.set.call(el,v);refreshLabel();},
            configurable:true
        });
        const source=isSelect?el:datalist;
        if (source&&window.MutationObserver) {
            new MutationObserver(function() {
                refreshLabel();
                if (wrap.classList.contains("open")) {renderList();}
            }).observe(source,{childList:true,subtree:true,characterData:true});
        }
        refreshLabel();
        const api={close:close};
        pickers.push(api);
    }
    window.enhancePickers=function(root) {
        (root||document).querySelectorAll("select[data-picker],input[data-picker]").forEach(function(el) {
            if (!el.closest(".sp")) {build(el);}
        });
    };
})();

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
	document.body.classList.toggle("guest",!token);
	const rail=document.createElement("div");
	rail.id="side-rail";
	rail.innerHTML=
		(token
			?'<button class="side-icon" id="rail-tools" title="Инструменты" aria-label="Инструменты"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="2.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="2.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="2.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="2.5"/></svg></button>' +
			 '<button class="side-icon" id="rail-person" title="Кабинет" aria-label="Кабинет"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5"/></svg></button>' +
			 '<button class="side-icon" id="rail-gear" title="Настройки" aria-label="Настройки"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/></svg></button>'
			:'') 
    const panel=document.createElement("div");
    panel.id="side-panel";
    let links="";
    if (!token){
        links+='<a href="/index.html">Вход</a>';
        links+='<a href="/reg-page.html">Регистрация</a>';
    }else{
		links+='<a href="/menu.html">Школьное меню</a>';
		if(role==="STUDENT"){
			links+='<a href="/diary.html">Электронный дневник</a>';
		}
		if(role==="TEACHER"||role==="ADMIN"||role==="MAIN_DEVELOPER"){
			links+='<a href="/journal.html">Журнал оценок</a>';
		}
		if(role==="MAIN_DEVELOPER"){
			links+='<a href="/student-list.html">Список учеников</a>';
			links+='<a href="/register-student.html">Регистрация ученика</a>';
			links+='<a href="/applications.html">Заявки на аккаунты</a>';
			links+='<a href="/assign.html">Учителя: классы и предметы</a>';
			links+='<a href="/reg-admin.html">Зарегистрировать администратора</a>';
			links+='<a href="/summary.html">Утренняя сводка</a>';
			links+='<a href="/set-school-menu.html">Установить школьное меню</a>';
		}
        if (role==="ADMIN") {
			links+='<a href="/student-list.html">Список учеников</a>';
			links+='<a href="/register-student.html">Регистрация ученика</a>';
			links+='<a href="/applications.html">Заявки на аккаунты</a>';
			links+='<a href="/assign.html">Учителя: классы и предметы</a>';
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
        const tb=document.getElementById("rail-tools");
        if (tb) {tb.classList.remove("active");}
    }
   const toolsBtn=document.getElementById("rail-tools");
	if(toolsBtn){
		toolsBtn.addEventListener("click",function(){
			panel.classList.toggle("open");
			toolsBtn.classList.toggle("active",panel.classList.contains("open"));
		});
	}
	const personBtn=document.getElementById("rail-person");
	if(personBtn){
		personBtn.addEventListener("click",function(){
			closePanel();
			location.href="/index.html";
		});
	}
	const gearBtn=document.getElementById("rail-gear");
	if(gearBtn){
		gearBtn.addEventListener("click",function(){
			closePanel();
			location.href="/settings.html";
		});
	}
	panel.addEventListener("click",closePanel);
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
