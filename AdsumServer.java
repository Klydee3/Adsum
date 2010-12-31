import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import java.io.*;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.ArrayList;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.FileInputStream;
public class AdsumServer {
    static String esc(String s) {
        return Adsum.jsonEsc(s);
    }
    static String err(String message) {
        return "{\"result\":\"error\",\"message\":\""+esc(message)+"\"}";
    }
    static Map<String,String> parseQuery(HttpExchange exchange) {
        Map<String,String> params=new HashMap<>();
        String query=exchange.getRequestURI().getRawQuery();
        if (query!=null) {
            for (String pair:query.split("&")) {
                String[] kv=pair.split("=",2);
                if (kv.length==2) {
                    params.put(URLDecoder.decode(kv[0],StandardCharsets.UTF_8),URLDecoder.decode(kv[1],StandardCharsets.UTF_8));
                }
            }
        }
        return params;
    }
    static Map<String,String> parseBody(HttpExchange exchange) throws IOException {
        String body=new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String,String> result=new HashMap<>();
        if(body.isEmpty()) {
            return result;
        }
        for(String pair:body.split("&")) {
            String kv[]=pair.split("=",2);
            if(kv.length==2) {
                result.put(URLDecoder.decode(kv[0],StandardCharsets.UTF_8),URLDecoder.decode(kv[1],StandardCharsets.UTF_8));
            }
        }
        return result;
    }
    static void sendJson(HttpExchange exchange,int code,String json) throws IOException {
        byte[] bytes=json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type","application/json;charset=UTF-8");
        exchange.sendResponseHeaders(code,bytes.length);
        OutputStream os=exchange.getResponseBody();
        os.write(bytes);
        os.close();
    }
    static void sendJson(HttpExchange exchange,String json) throws IOException {
        sendJson(exchange,200,json);
    }
    static String tokenOf(HttpExchange exchange) {
        String auth=exchange.getRequestHeaders().getFirst("Authorization");
        if(auth==null||!auth.startsWith("Bearer ")) {
            return null;
        }
        return auth.substring(7).trim();
    }
    static Account accountByToken(HttpExchange exchange) {
        String token=tokenOf(exchange);
        return token==null?null:Adsum.sessions.get(token);
    }
    static Account requireAuth(HttpExchange exchange) throws IOException {
        Account account=accountByToken(exchange);
        if(account==null) {
            sendJson(exchange,401,err("не авторизован"));
        }
        return account;
    }
    static boolean requirePost(HttpExchange exchange) throws IOException {
        if(!"POST".equals(exchange.getRequestMethod())) {
            sendJson(exchange,405,err("Этот запрос изменяет данные, нужен POST"));
            return false;
        }
        return true;
    }
    static boolean isStaff(Account a) {
        return a.getRole()==Role.ADMIN||a.getRole()==Role.MAIN_DEVELOPER;
    }
    static boolean inScope(Account actor,String school) {
        if(actor.getRole()==Role.MAIN_DEVELOPER) {
            return true;
        }
        String mine=actor.getSchool();
        return !mine.isEmpty()&&mine.equals(school);
    }
    static boolean canManage(Account actor,String school) {
        return isStaff(actor)&&inScope(actor,school);
    }
    static boolean cleanField(String v) {
        return v!=null&&!v.isEmpty()&&v.length()<=100
            &&v.indexOf(':')<0&&v.indexOf(';')<0&&v.indexOf('\n')<0&&v.indexOf('\r')<0;
    }
    static String param(Map<String,String> params,String key) {
        String v=params.get(key);
        return v==null?"":v.trim();
    }
    static int leadingNumber(String s) {
        int i=0;
        while(i<s.length()&&Character.isDigit(s.charAt(i))) {
            i++;
        }
        return i==0?Integer.MAX_VALUE:Integer.parseInt(s.substring(0,Math.min(i,9)));
    }
    static int compareClasses(String a,String b) {
        int x=leadingNumber(a),y=leadingNumber(b);
        if(x!=y) {
            return Integer.compare(x,y);
        }
        return a.compareTo(b);
    }
    static class StudentsHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            Account account=requireAuth(exchange);
            if (account==null) {
                return;
            }
            if (!isStaff(account)) {
                sendJson(exchange,403,err("нет доступа"));
                return;
            }
            ArrayList<Student> list=new ArrayList<>();
            for (Student s:Adsum.students.values()) {
                if (canManage(account,s.getSchool())) {
                    list.add(s);
                }
            }
            list.sort((a,b)->{
                int c=compareClasses(a.getClassName(),b.getClassName());
                return c!=0?c:a.fullName().compareTo(b.fullName());
            });
            StringBuilder sb=new StringBuilder("[");
            for (int i=0;i<list.size();i++) {
                if (i>0) {
                    sb.append(", ");
                }
                sb.append(list.get(i).toJson());
            }
            sendJson(exchange,sb.append("]").toString());
        }
    }
    static class SchoolsHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            StringBuilder sb=new StringBuilder("{\"result\":\"ok\",\"schools\":[");
            boolean first=true;
            for (String s:FileStorage.loadSchoolNames("schoolsList.txt")) {
                if (!first) {
                    sb.append(",");
                }
                first=false;
                sb.append("\"").append(esc(s)).append("\"");
            }
            sendJson(exchange,sb.append("]}").toString());
        }
    }
    static class RegisterHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            if (!requirePost(exchange)) {
                return;
            }
            Account account=requireAuth(exchange);
            if (account==null) {
                return;
            }
            if (!isStaff(account)) {
                sendJson(exchange,403,err("нет доступа"));
                return;
            }
            Map<String,String> params=parseBody(exchange);
            String name=param(params,"name");
            String surname=param(params,"surname");
            String className=param(params,"className");
            if (!cleanField(name)||!cleanField(surname)||!cleanField(className)) {
                sendJson(exchange,err("нужны имя, фамилия и класс (без символов : ; и переводов строк)"));
                return;
            }
            String school;
            if (account.getRole()==Role.ADMIN) {
                school=account.getSchool();
                if (school.isEmpty()) {
                    sendJson(exchange,err("у вашего аккаунта не указана школа"));
                    return;
                }
            } else {
                school=param(params,"school");
                if (school.isEmpty()||!FileStorage.loadSchoolNames("schoolsList.txt").contains(school)) {
                    sendJson(exchange,err("укажите школу из списка"));
                    return;
                }
            }
            String key=surname+" "+name;
            if (Adsum.students.containsKey(key)||Adsum.accounts.containsKey(key)) {
                sendJson(exchange,err("уже есть в списках"));
                return;
            }
            String salt=Adsum.newSalt();
            String hash=Adsum.hashPassword("12345678",salt);
            Account studentAcc=new Account(key,Role.STUDENT,salt,hash);
            studentAcc.setApproved(true);
            studentAcc.setSchool(school);
            Adsum.accounts.put(key,studentAcc);
            Adsum.students.put(key,new Student(name,surname,className,RegistrationStatus.APPROVED,school));
            Adsum.saveAccounts();
            Adsum.saveStudents();
            sendJson(exchange,"{\"result\":\"ok\",\"name\":\""+esc(key)+"\"}");
        }
    }
    static class SaveHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            if (!requirePost(exchange)) {
                return;
            }
            Account account=requireAuth(exchange);
            if (account==null) {
                return;
            }
            if (!isStaff(account)) {
                sendJson(exchange,403,err("нет доступа"));
                return;
            }
            Adsum.saveStudents();
            Adsum.saveAccounts();
            sendJson(exchange,"{\"result\":\"ok\",\"message\":\"saved\"}");
        }
    }
    static class PageHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            String path=exchange.getRequestURI().getPath();
            if(path.equals("/")) {
                path="/index.html";
            }
            File root=new File("web").getCanonicalFile();
            File file=new File(root,path).getCanonicalFile();
            if(!file.toPath().startsWith(root.toPath())||!file.isFile()) {
                byte[] msg="404 Not Found".getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type","text/plain; charset=UTF-8");
                exchange.sendResponseHeaders(404,msg.length);
                OutputStream os=exchange.getResponseBody();
                os.write(msg);
                os.close();
                return;
            }
            byte[] bytes=java.nio.file.Files.readAllBytes(file.toPath());
            String lower=file.getName().toLowerCase();
            String contentType=lower.endsWith(".css")?"text/css; charset=UTF-8"
                :lower.endsWith(".js")?"text/javascript; charset=UTF-8"
                :lower.endsWith(".png")?"image/png"
                :lower.endsWith(".html")?"text/html; charset=UTF-8"
                :"application/octet-stream";
            exchange.getResponseHeaders().set("Content-Type",contentType);
            exchange.getResponseHeaders().set("X-Content-Type-Options","nosniff");
            exchange.sendResponseHeaders(200,bytes.length);
            OutputStream os=exchange.getResponseBody();
            os.write(bytes);
            os.close();
        }
    }
    static class AttendHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            if (!requirePost(exchange)) {
                return;
            }
            Account account=requireAuth(exchange);
            if (account==null) {
                return;
            }
            String key=account.getLogin();
            Student target=Adsum.students.get(key);
            if (target==null) {
                sendJson(exchange,err("Ты не найден в списках школы"));
                return;
            }
            String today=java.time.LocalDate.now().toString();
            boolean alreadyMarked=false;
            File f=new File("attendance.txt");
            if(f.exists()){
                try(BufferedReader reader=new BufferedReader(
                        new InputStreamReader(new FileInputStream(f),StandardCharsets.UTF_8))){
                    String line;
                    while((line=reader.readLine())!=null){
                        String[] p=line.split(";");
                        if(p.length>=3&&p[0].equals(today)&&p[1].equals(key)){
                            alreadyMarked=true;
                            break;
                        }
                    }
                }
            }
            if(alreadyMarked){
                sendJson(exchange,err("Вы уже отметились сегодня. Отметку изменить нельзя."));
                return;
            }
            Map<String,String> params=parseBody(exchange);
            String answer=params.get("answer");
            String reason=params.get("reason");
            if (reason==null) {
                reason="";
            }
            reason=reason.replace(";"," ").replace("\""," ").replace("\n"," ").replace("\r"," ").trim();
            if(!"yes".equals(answer)&&!"no".equals(answer)){
                sendJson(exchange,err("Некорректный ответ"));
                return;
            }
            if("no".equals(answer)&&reason.isEmpty()){
                sendJson(exchange,err("Нужно обязательно ввести причину отсутствия!"));
                return;
            }
            FileStorage.addAttendanceMark(key,answer,reason);
            sendJson(exchange,"{\"result\":\"ok\",\"name\":\""+esc(key)+"\"}");
        }
    }
    // Защита от подбора пароля: 5 неверных попыток -> блокировка входа для логина на 1 минуту
    static final int MAX_LOGIN_ATTEMPTS=5;
    static final long LOGIN_LOCK_MS=60_000;
    static final long LOGIN_IDLE_RESET_MS=10*60_000;
    static class LoginAttempt {
        int fails;
        long lastFail;
        long lockedUntil;
    }
    static final Map<String,LoginAttempt> loginAttempts=new HashMap<>();
    static String attemptKey(String login) {
        return login.length()>200?login.substring(0,200):login;
    }
    // Сколько секунд ещё действует блокировка (0 - вход разрешён)
    static synchronized long loginLockSeconds(String login) {
        String key=attemptKey(login);
        LoginAttempt a=loginAttempts.get(key);
        if(a==null||a.lockedUntil==0) {
            return 0;
        }
        long left=a.lockedUntil-System.currentTimeMillis();
        if(left>0) {
            return (left+999)/1000;
        }
        loginAttempts.remove(key);
        return 0;
    }
    // Записывает неудачную попытку, возвращает сколько попыток осталось (0 - логин заблокирован)
    static synchronized int registerLoginFailure(String login) {
        long now=System.currentTimeMillis();
        if(loginAttempts.size()>10000) {
            loginAttempts.values().removeIf(x->x.lockedUntil<now&&now-x.lastFail>LOGIN_IDLE_RESET_MS);
        }
        LoginAttempt a=loginAttempts.computeIfAbsent(attemptKey(login),k->new LoginAttempt());
        if(a.fails>0&&now-a.lastFail>LOGIN_IDLE_RESET_MS) {
            a.fails=0;
        }
        a.fails++;
        a.lastFail=now;
        if(a.fails>=MAX_LOGIN_ATTEMPTS) {
            a.lockedUntil=now+LOGIN_LOCK_MS;
            return 0;
        }
        return MAX_LOGIN_ATTEMPTS-a.fails;
    }
    static synchronized void clearLoginFailures(String login) {
        loginAttempts.remove(attemptKey(login));
    }
    static class LoginHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            if(!"POST".equals(exchange.getRequestMethod())) {
                sendJson(exchange,405,err("нужен POST"));
                return;
            }
            Map<String,String> params=parseBody(exchange);
            String login=params.get("login");
            String password=params.get("password");
            if (login==null||password==null) {
                sendJson(exchange,err("нужны логин и пароль"));
                return;
            }
            long wait=loginLockSeconds(login);
            if(wait>0) {
                sendJson(exchange,429,err("Слишком много неверных попыток. Повторите через "+wait+" сек."));
                return;
            }
            Account account=Adsum.accounts.get(login);
            if (account==null||!Adsum.hashPassword(password,account.getSalt()).equals(account.getPasswordHash())) {
                int left=registerLoginFailure(login);
                if(left==0) {
                    sendJson(exchange,429,err("Слишком много неверных попыток. Вход заблокирован на "+(LOGIN_LOCK_MS/1000)+" сек."));
                } else {
                    sendJson(exchange,err("неверный логин или пароль. Осталось попыток: "+left));
                }
                return;
            }
            clearLoginFailures(login);
            if(!account.isApproved()) {
                sendJson(exchange,err("Аккаунт ещё не подтверждён администрацией"));
                return;
            }
            String token=java.util.UUID.randomUUID().toString();
            Adsum.sessions.put(token,account);
            sendJson(exchange,"{\"result\":\"ok\",\"token\":\""+token+"\",\"role\":\""+account.getRole()
                +"\",\"login\":\""+esc(account.getLogin())+"\",\"school\":\""+esc(account.getSchool())+"\"}");
        }
    }
    static class MeHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            Account account=requireAuth(exchange);
            if (account==null) {
                return;
            }
            sendJson(exchange,"{\"result\":\"ok\",\"login\":\""+esc(account.getLogin())+"\",\"role\":\""+account.getRole()
                +"\",\"school\":\""+esc(account.getSchool())+"\"}");
        }
    }
    static class LogoutHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            if (!requirePost(exchange)) {
                return;
            }
            String token=tokenOf(exchange);
            if (token!=null) {
                Adsum.sessions.remove(token);
            }
            sendJson(exchange,"{\"result\":\"ok\"}");
        }
    }
    static class ChangePasswordHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            if (!requirePost(exchange)) {
                return;
            }
            Account account=requireAuth(exchange);
            if(account==null) {
                return;
            }
            Map<String, String> params=parseBody(exchange);
            String oldPassword=params.get("oldPassword");
            String newPassword=params.get("newPassword");
            if (oldPassword==null||newPassword==null) {
                sendJson(exchange,err("нужны старый и новый пароль"));
                return;
            }
            if (!Adsum.hashPassword(oldPassword,account.getSalt()).equals(account.getPasswordHash())) {
                sendJson(exchange,err("неверный текущий пароль"));
                return;
            }
            if(newPassword.length()<8) {
                sendJson(exchange,err("новый пароль слишком короткий(не менее 8 символов)"));
                return;
            }
            String salt=Adsum.newSalt();
            account.setSalt(salt);
            account.setPasswordHash(Adsum.hashPassword(newPassword,salt));
            Adsum.saveAccounts();
            Adsum.dropSessions(account);
            sendJson(exchange,"{\"result\":\"ok\",\"message\":\"пароль успешно изменён!\"}");
        }
    }
    static class DeleteStudentHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            if (!requirePost(exchange)) {
                return;
            }
            Account account=requireAuth(exchange);
            if(account==null) {
                return;
            }
            if(!isStaff(account)) {
                sendJson(exchange,403,err("недостаточно прав"));
                return;
            }
            Map<String,String> params=parseQuery(exchange);
            params.putAll(parseBody(exchange));
            String name=param(params,"name");
            String surname=param(params,"surname");
            if(name.isEmpty()||surname.isEmpty()) {
                sendJson(exchange,err("нужны имя и фамилия"));
                return;
            }
            String key=surname+" "+name;
            Student student=Adsum.students.get(key);
            if(student==null) {
                sendJson(exchange,err("ученик не найден"));
                return;
            }
            if(!canManage(account,student.getSchool())) {
                sendJson(exchange,403,err("ученик из другой школы"));
                return;
            }
            Account studentAcc=Adsum.accounts.get(key);
            if(studentAcc!=null&&studentAcc.getRole()!=Role.STUDENT) {
                sendJson(exchange,err("под этим именем зарегистрирован не ученик"));
                return;
            }
            Adsum.deleteUser(key);
            sendJson(exchange,"{\"result\":\"ok\",\"message\":\"ученик удален\"}");
        }
    }
    static class DeleteTeacherHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            if (!requirePost(exchange)) {
                return;
            }
            Account account=requireAuth(exchange);
            if(account==null) {
                return;
            }
            if(!isStaff(account)) {
                sendJson(exchange,403,err("недостаточно прав"));
                return;
            }
            String login=param(parseBody(exchange),"teacher");
            Account teacher=Adsum.accounts.get(login);
            if(teacher==null||teacher.getRole()!=Role.TEACHER) {
                sendJson(exchange,err("учитель не найден"));
                return;
            }
            if(!canManage(account,teacher.getSchool())) {
                sendJson(exchange,403,err("учитель из другой школы"));
                return;
            }
            Adsum.deleteUser(login);
            sendJson(exchange,"{\"result\":\"ok\",\"message\":\"учитель удалён\"}");
        }
    }
    static class DeleteAccountHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            if (!requirePost(exchange)) {
                return;
            }
            Account account=requireAuth(exchange);
            if(account==null) {
                return;
            }
            String password=parseBody(exchange).get("password");
            if(password==null||!Adsum.hashPassword(password,account.getSalt()).equals(account.getPasswordHash())) {
                sendJson(exchange,err("неверный пароль"));
                return;
            }
            if(account.getRole()==Role.MAIN_DEVELOPER) {
                int devs=0;
                for(Account a:Adsum.accounts.values()) {
                    if(a.getRole()==Role.MAIN_DEVELOPER) {
                        devs++;
                    }
                }
                if(devs<=1) {
                    sendJson(exchange,err("нельзя удалить единственного главного разработчика"));
                    return;
                }
            }
            Adsum.deleteUser(account.getLogin());
            sendJson(exchange,"{\"result\":\"ok\",\"message\":\"аккаунт удалён\"}");
        }
    }
    static class SummaryHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            Account account=requireAuth(exchange);
            if(account==null) {
                return;
            }
            if(account.getRole()==Role.STUDENT) {
                sendJson(exchange,403,err("нет доступа"));
                return;
            }
            Map<String,String> params=parseQuery(exchange);
            String date=params.get("date");
            if(date==null||date.isEmpty()) {
                date=java.time.LocalDate.now().toString();
            }
            if(!date.matches("\\d{4}-\\d{2}-\\d{2}")) {
                sendJson(exchange,err("некорректная дата"));
                return;
            }
            Map<String,String> last=new HashMap<>();
            Map<String,String> lastReason=new HashMap<>();
            File f=new File("attendance.txt");
            if(f.exists()) {
                try(BufferedReader reader=new BufferedReader(
                        new InputStreamReader(new FileInputStream(f),StandardCharsets.UTF_8))) {
                    String line;
                    while((line=reader.readLine())!=null) {
                        String[] p=line.split(";",4);
                        if(p.length>=3&&p[0].equals(date)) {
                            last.put(p[1],p[2]);
                            if(p.length>=4) {
                                lastReason.put(p[1],p[3]);
                            }
                        }
                    }
                }
            }
            String myClass=null;
            if(account.getRole()==Role.TEACHER) {
                myClass=Adsum.classTeacher.get(account.getLogin());
            }
            Map<String,int[]> byClass=new java.util.TreeMap<>(AdsumServer::compareClasses);
            StringBuilder sbAbs=new StringBuilder();
            boolean firstAbs=true;
            for(Student s:Adsum.students.values()) {
                if(!inScope(account,s.getSchool())) {
                    continue;
                }
                if(myClass!=null&&!myClass.equals(s.getClassName())) {
                    continue;
                }
                int[] c=byClass.get(s.getClassName());
                if(c==null) {
                    c=new int[3];
                    byClass.put(s.getClassName(),c);
                }
                c[0]++;
                String ans=last.get(s.fullName());
                if("yes".equals(ans)) {
                    c[1]++;
                } else if("no".equals(ans)) {
                    c[2]++;
                    if(!firstAbs) {
                        sbAbs.append(",");
                    }
                    firstAbs=false;
                    String r=lastReason.get(s.fullName());
                    sbAbs.append("{\"name\":\"").append(esc(s.fullName()))
                      .append("\",\"class\":\"").append(esc(s.getClassName()))
                      .append("\",\"reason\":\"").append(esc(r==null?"":r))
                      .append("\"}");
                }
            }
            StringBuilder sb=new StringBuilder();
            sb.append("{\"result\":\"ok\",\"date\":\"").append(date).append("\",\"rows\":[");
            boolean first=true;
            int totalAll=0,presentAll=0;
            for(Map.Entry<String,int[]> e:byClass.entrySet()) {
                if(!first) {
                    sb.append(",");
                }
                first=false;
                int total=e.getValue()[0],pr=e.getValue()[1],ab=e.getValue()[2];
                int silent=total-pr-ab;
                totalAll+=total;
                presentAll+=pr;
                int percent=total==0?0:pr*100/total;
                sb.append("{\"class\":\"").append(esc(e.getKey()))
                  .append("\",\"total\":").append(total)
                  .append(",\"present\":").append(pr)
                  .append(",\"absent\":").append(ab)
                  .append(",\"silent\":").append(silent)
                  .append(",\"percent\":").append(percent).append("}");
            }
            sb.append("],\"totalAll\":").append(totalAll)
              .append(",\"presentAll\":").append(presentAll)
              .append(",\"absents\":[").append(sbAbs).append("]}");
            sendJson(exchange,sb.toString());
        }
    }
    static class TeacherNAdminRegisterHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            if (!requirePost(exchange)) {
                return;
            }
            Map<String,String> params=parseBody(exchange);
            String name=param(params,"name");
            String surname=param(params,"surname");
            String password=params.get("password");
            String roleStr=params.get("role");
            String school=param(params,"school");
            Role role;
            if("TEACHER".equals(roleStr)) {
                role=Role.TEACHER;
            } else if("ADMIN".equals(roleStr)) {
                role=Role.ADMIN;
            } else if("CAFETERIA".equals(roleStr)) {
                role=Role.CAFETERIA;
            } else {
                sendJson(exchange,err("некорректная роль!"));
                return;
            }
            if(!FileStorage.loadSchoolNames("schoolsList.txt").contains(school)) {
                sendJson(exchange,err("данной школы нет в списках!"));
                return;
            }
            if (!cleanField(name)||!cleanField(surname)) {
                sendJson(exchange,err("нужны имя и фамилия (без символов : ; и переводов строк)!"));
                return;
            }
            if (password==null||password.length()<8) {
                sendJson(exchange,err("пароль не короче 8 символов!"));
                return;
            }
            String key=surname+" "+name;
            if (Adsum.accounts.containsKey(key)) {
                sendJson(exchange,err("уже есть в списках"));
                return;
            }
            String salt=Adsum.newSalt();
            Account newAcc=new Account(key,role,salt,Adsum.hashPassword(password,salt));
            newAcc.setSchool(school);
            Adsum.accounts.put(key,newAcc);
            Adsum.saveAccounts();
            sendJson(exchange,"{\"result\":\"ok\",\"message\":\"Заявка создана, ждёт подтверждения администрацией\"}");
        }
    }
    static class PendingAccountsHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            Account account=requireAuth(exchange);
            if (account==null) {
                return;
            }
            if (!isStaff(account)) {
                sendJson(exchange,403,err("нет доступа"));
                return;
            }
            StringBuilder sb=new StringBuilder("{\"result\":\"ok\",\"rows\":[");
            boolean first=true;
            for (Account a:Adsum.accounts.values()) {
                if (a.isApproved()||!canManage(account,a.getSchool())) {
                    continue;
                }
                if (!first) {
                    sb.append(",");
                }
                first=false;
                sb.append("{\"login\":\"").append(esc(a.getLogin()))
                  .append("\",\"role\":\"").append(a.getRole())
                  .append("\",\"school\":\"").append(esc(a.getSchool()))
                  .append("\"}");
            }
            sb.append("]}");
            sendJson(exchange,sb.toString());
        }
    }
    static class ApproveAccountHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            if (!requirePost(exchange)) {
                return;
            }
            Account account=requireAuth(exchange);
            if (account==null) {
                return;
            }
            if (!isStaff(account)) {
                sendJson(exchange,403,err("нет доступа"));
                return;
            }
            String login=param(parseBody(exchange),"login");
            Account target=Adsum.accounts.get(login);
            if (target==null) {
                sendJson(exchange,err("аккаунт не найден"));
                return;
            }
            if (!canManage(account,target.getSchool())) {
                sendJson(exchange,403,err("Заявка в другую школу"));
                return;
            }
            target.setApproved(true);
            Adsum.saveAccounts();
            sendJson(exchange,"{\"result\":\"ok\",\"message\":\"аккаунт подтверждён\"}");
        }
    }
    static class TeachersListHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            Account account=requireAuth(exchange);
            if (account==null) {
                return;
            }
            if (!isStaff(account)) {
                sendJson(exchange,403,err("нет доступа"));
                return;
            }
            StringBuilder sb=new StringBuilder("{\"result\":\"ok\",\"teachers\":[");
            boolean first=true;
            for (Account a:Adsum.accounts.values()) {
                if (a.getRole()!=Role.TEACHER||!a.isApproved()||!canManage(account,a.getSchool())) {
                    continue;
                }
                String cls=Adsum.classTeacher.get(a.getLogin());
                if (!first) {
                    sb.append(",");
                }
                first=false;
                sb.append("{\"login\":\"").append(esc(a.getLogin())).append("\",");
                sb.append("\"class\":\"").append(esc(cls==null?"":cls)).append("\"}");
            }
            sb.append("]}");
            sendJson(exchange,sb.toString());
        }
    }
    static class AssignClassHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            if (!requirePost(exchange)) {
                return;
            }
            Account account=requireAuth(exchange);
            if(account==null) {
                return;
            }
            if(!isStaff(account)) {
                sendJson(exchange,403,err("нет доступа"));
                return;
            }
            Map<String,String> params=parseBody(exchange);
            String teacher=param(params,"teacher");
            String cls=param(params,"class");
            if(teacher.isEmpty()) {
                sendJson(exchange,err("не указан учитель"));
                return;
            }
            Account t=Adsum.accounts.get(teacher);
            if(t==null||t.getRole()!=Role.TEACHER) {
                sendJson(exchange,err("аккаунт не является учителем"));
                return;
            }
            if(!canManage(account,t.getSchool())) {
                sendJson(exchange,403,err("учитель из другой школы"));
                return;
            }
            if(cls.isEmpty()) {
                Adsum.classTeacher.remove(teacher);
            } else if(cleanField(cls)) {
                Adsum.classTeacher.put(teacher,cls);
            } else {
                sendJson(exchange,err("некорректное название класса"));
                return;
            }
            Adsum.saveClassTeachers();
            sendJson(exchange,"{\"result\":\"ok\"}");
        }
    }
    static class RegDevHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            if (!requirePost(exchange)) {
                return;
            }
            Account acc=requireAuth(exchange);
            if(acc==null) {
                return;
            }
            if(acc.getRole()!=Role.MAIN_DEVELOPER&&acc.getRole()!=Role.ADMIN) {
                sendJson(exchange,403,err("Нет доступа"));
                return;
            }
            Map<String,String> params=parseBody(exchange);
            String pass=params.get("pass");
            String name=param(params,"name");
            if(pass==null||pass.isEmpty()||name.isEmpty()) {
                sendJson(exchange,err("Введите все поля!"));
                return;
            }
            if(!cleanField(name)) {
                sendJson(exchange,err("Имя не должно содержать : ; и переводов строк"));
                return;
            }
            if(pass.length()<8) {
                sendJson(exchange,err("Пароль не короче 8 символов!"));
                return;
            }
            if(Adsum.accounts.containsKey(name)) {
                sendJson(exchange,err("Аккаунт с таким именем уже существует!"));
                return;
            }
            String devSalt=Adsum.newSalt();
            Account devAcc=new Account(name,Role.MAIN_DEVELOPER,devSalt,Adsum.hashPassword(pass,devSalt));
            devAcc.setApproved(true);
            Adsum.accounts.put(name,devAcc);
            Adsum.saveAccounts();
            sendJson(exchange,"{\"result\":\"ok\",\"message\":\"Аккаунт Главного Разработчика успешно создан!\"}");
        }
    }
    static void route(HttpServer server,String path,HttpHandler handler) {
        server.createContext(path,exchange->{
            try {
                handler.handle(exchange);
            } catch (Exception e) {
                e.printStackTrace();
                try {
                    sendJson(exchange,500,err("внутренняя ошибка сервера"));
                } catch (Exception ignored) {
                }
            } finally {
                exchange.close();
            }
        });
    }
    public static void main(String[] args) throws IOException {
        Adsum.loadRegistry();
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        route(server,"/api/students",new StudentsHandler());
        route(server,"/api/schools",new SchoolsHandler());
        route(server,"/api/register",new RegisterHandler());
        route(server,"/api/save",new SaveHandler());
        route(server,"/",new PageHandler());
        route(server,"/api/attend",new AttendHandler());
        route(server,"/api/login",new LoginHandler());
        route(server,"/api/me",new MeHandler());
        route(server,"/api/logout",new LogoutHandler());
        route(server,"/api/change-password",new ChangePasswordHandler());
        route(server,"/api/delete-student",new DeleteStudentHandler());
        route(server,"/api/delete-teacher",new DeleteTeacherHandler());
        route(server,"/api/delete-account",new DeleteAccountHandler());
        route(server,"/api/summary",new SummaryHandler());
        route(server,"/api/teacher-n-admin-register",new TeacherNAdminRegisterHandler());
        route(server,"/api/pending-accounts",new PendingAccountsHandler());
        route(server,"/api/approve-account",new ApproveAccountHandler());
        route(server,"/api/teachers-list",new TeachersListHandler());
        route(server,"/api/assign-class",new AssignClassHandler());
        route(server,"/api/reg-dev",new RegDevHandler());
        server.start();
        System.out.println("Сервер запущен на порту 8080!");
    }
}
