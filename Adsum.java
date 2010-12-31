import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.io.*;
import java.nio.charset.StandardCharsets;
public class Adsum {
    static HashMap<String,Student> students=new HashMap<>();
    static HashMap<String,Account> accounts=new HashMap<>();
    static HashMap<String,Account> sessions=new HashMap<>();
	public static java.util.Map<String,String> classTeacher=new java.util.HashMap<>();
	static String jsonEsc(String s) {
		if(s==null) {
			return "";
		}
		StringBuilder sb=new StringBuilder();
		for(char c:s.toCharArray()) {
			switch(c) {
				case '"': sb.append("\\\""); break;
				case '\\': sb.append("\\\\"); break;
				case '\n': sb.append("\\n"); break;
				case '\r': sb.append("\\r"); break;
				case '\t': sb.append("\\t"); break;
				default:
					if(c<0x20) {
						sb.append(String.format("\\u%04x",(int)c));
					}else{
						sb.append(c);
					}
			}
		}
		return sb.toString();
	}
    static Account newAccount(String login,Role role,String password,String school) {
        String salt=newSalt();
        Account acc=new Account(login,role,salt,hashPassword(password,salt));
        acc.setApproved(true);
        acc.setSchool(school);
        return acc;
    }
    static void rebuildViews() {
        students.clear();
        classTeacher.clear();
        for(Account a:accounts.values()) {
            if(a.getRole()==Role.STUDENT) {
                String login=a.getLogin();
                int space=login.indexOf(' ');
                String surname=space<0?login:login.substring(0,space);
                String name=space<0?"":login.substring(space+1);
                RegistrationStatus status=a.isApproved()?RegistrationStatus.APPROVED:RegistrationStatus.PENDING;
                students.put(login,new Student(name,surname,a.getClassName(),status,a.getSchool()));
            } else if(a.getRole()==Role.TEACHER&&!a.getClassName().isEmpty()) {
                classTeacher.put(a.getLogin(),a.getClassName());
            }
        }
    }
    static void backupLegacyFile(String fileName) {
        java.io.File f=new java.io.File(fileName);
        if(!f.exists()) {
            return;
        }
        try {
            java.nio.file.Files.move(f.toPath(),java.nio.file.Paths.get(fileName+".bak"),
                java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            System.out.println("Не удалось сохранить копию "+fileName+": "+e.getMessage());
        }
    }
    // Старые файлы students.txt и classteachers.txt переносятся в accounts.txt один раз
    static boolean importLegacyFiles() {
        boolean changed=false;
        if(new java.io.File("students.txt").exists()) {
            for(Student s:FileStorage.loadStudents("students.txt")) {
                Account a=accounts.get(s.fullName());
                if(a==null) {
                    a=newAccount(s.fullName(),Role.STUDENT,"12345678",s.getSchool());
                    accounts.put(a.getLogin(),a);
                }
                a.setClassName(s.getClassName());
                if(a.getSchool().isEmpty()) {
                    a.setSchool(s.getSchool());
                }
            }
            backupLegacyFile("students.txt");
            changed=true;
        }
        java.io.File f=new java.io.File("classteachers.txt");
        if(f.exists()) {
            try(BufferedReader r=new BufferedReader(new InputStreamReader(new FileInputStream(f),StandardCharsets.UTF_8))){
                String line;
                while((line=r.readLine())!=null){
                    String[] p=line.split(";");
                    Account a=p.length==2?accounts.get(p[0]):null;
                    if(a!=null&&a.getRole()==Role.TEACHER){
                        a.setClassName(p[1]);
                    }
                }
            }catch(IOException e){
                System.out.println("Ошибка чтения classteachers.txt: "+e.getMessage());
            }
            backupLegacyFile("classteachers.txt");
            changed=true;
        }
        return changed;
    }
    // Если в системе нет ни одного главного разработчика, создаётся maindev
    static boolean ensureMainDeveloper() {
        for(Account a:accounts.values()) {
            if(a.getRole()==Role.MAIN_DEVELOPER) {
                return false;
            }
        }
        if(accounts.containsKey("maindev")) {
            System.out.println("Автосоздание maindev пропущено: логин уже занят другим аккаунтом");
            return false;
        }
        accounts.put("maindev",newAccount("maindev",Role.MAIN_DEVELOPER,"12345678910",""));
        System.out.println("Создан главный разработчик по умолчанию: maindev");
        return true;
    }
    static void loadRegistry() {
        accounts.clear();
        List<Account> loaded=FileStorage.loadAccounts("accounts.txt");
        boolean rewrite=false;
        if(loaded.isEmpty()) {
			ArrayList<String> schools=FileStorage.loadSchoolNames("schoolsList.txt");
			String defaultSchool=schools.isEmpty()?"":schools.get(0);
			accounts.put("teacher",newAccount("teacher",Role.TEACHER,"12345678",defaultSchool));
			accounts.put("admin",newAccount("admin",Role.ADMIN,"12345678",defaultSchool));
			accounts.put("cafe",newAccount("cafe",Role.CAFETERIA,"12345678",defaultSchool));
            rewrite=true;
        } else {
            for(Account a:loaded) {
                accounts.put(a.getLogin(),a);
            }
        }
        if(importLegacyFiles()) {
            rewrite=true;
        }
        if(ensureMainDeveloper()) {
            rewrite=true;
        }
        rebuildViews();
        if(rewrite) {
            saveAccounts();
        }
    }
    static String studentsToJson() {
        StringBuilder result=new StringBuilder("[");
        boolean first=true;
        for(Student s:students.values()) {
            if(!first) {
                result.append(", ");
            }
            first=false;
            result.append(s.toJson());
        }
        return result.append("]").toString();
    }
    static void showAllJson() {
        System.out.println(studentsToJson());
    }
	static String newSalt() {
		byte[] salt=new byte[16];
		new SecureRandom().nextBytes(salt);
		return Base64.getEncoder().encodeToString(salt);
	}
	static String hashPassword(String password, String salt) {
		try {
			PBEKeySpec spec=new PBEKeySpec(password.toCharArray(),
				Base64.getDecoder().decode(salt),10000,256);
			SecretKeyFactory factory=SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
			byte[] hash=factory.generateSecret(spec).getEncoded();
			return Base64.getEncoder().encodeToString(hash);
		} catch (Exception e) {
			throw new RuntimeException(e);
		}
	}
	// Все данные (аккаунты, ученики, классные руководители) хранятся в одном файле accounts.txt
	static synchronized void saveAccounts() {
		for(Account a:accounts.values()) {
			if(a.getRole()==Role.STUDENT) {
				Student s=students.get(a.getLogin());
				a.setClassName(s==null?"":s.getClassName());
			} else if(a.getRole()==Role.TEACHER) {
				String c=classTeacher.get(a.getLogin());
				a.setClassName(c==null?"":c);
			} else {
				a.setClassName("");
			}
		}
		FileStorage.saveAccounts(new ArrayList<>(accounts.values()),"accounts.txt");
	}
	static void saveStudents() {
		saveAccounts();
	}
	static void saveClassTeachers(){
		saveAccounts();
	}
	static void dropSessions(Account acc) {
		sessions.values().removeIf(a->a==acc);
	}
	static synchronized void deleteUser(String login) {
		Account acc=accounts.remove(login);
		if(acc!=null) {
			dropSessions(acc);
		}
		students.remove(login);
		classTeacher.remove(login);
		saveAccounts();
	}
    public static void main(String[] args) {
        loadRegistry();
    }
}
