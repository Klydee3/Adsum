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
    static void loadRegistry() {
        students.clear();
        for (Student s:FileStorage.loadStudents("students.txt")) {
            students.put(s.fullName(),s);
        }
        accounts.clear();
        List<Account> loaded=FileStorage.loadAccounts("accounts.txt");
        if(loaded.isEmpty()) {
			ArrayList<String> schools=FileStorage.loadSchoolNames("schoolsList.txt");
			String defaultSchool=schools.isEmpty()?"":schools.get(0);
            for(Student a:students.values()) {
                String studentSalt=newSalt();
				Account studentAcc=new Account(a.fullName(),Role.STUDENT,studentSalt,hashPassword("12345678",studentSalt));
				studentAcc.setApproved(true);
				studentAcc.setSchool(a.getSchool());
				accounts.put(a.fullName(),studentAcc);
            }
            String teacherSalt=newSalt();
			Account teacherAcc=new Account("teacher",Role.TEACHER,teacherSalt,hashPassword("12345678",teacherSalt));
			teacherAcc.setApproved(true);
			teacherAcc.setSchool(defaultSchool);
			accounts.put("teacher",teacherAcc);
            String adminSalt=newSalt();
			Account adminAcc=new Account("admin",Role.ADMIN,adminSalt,hashPassword("12345678",adminSalt));
			adminAcc.setApproved(true);
			adminAcc.setSchool(defaultSchool);
			accounts.put("admin",adminAcc);
			String cafeSalt=newSalt();
			Account cafeAcc=new Account("cafe",Role.CAFETERIA,cafeSalt,hashPassword("12345678",cafeSalt));
			cafeAcc.setApproved(true);
			cafeAcc.setSchool(defaultSchool);
			accounts.put("cafe",cafeAcc);
            saveAccounts();
        } else {
            for(Account a:loaded) {
                accounts.put(a.getLogin(),a);
            }
        }
		loadClassTeachers();
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
	static void loadClassTeachers(){
		classTeacher.clear();
		java.io.File f=new java.io.File("classteachers.txt");
		if(!f.exists()){
			return;
		}
		try(BufferedReader r=new BufferedReader(new InputStreamReader(new FileInputStream(f),StandardCharsets.UTF_8))){
			String line;
			while((line=r.readLine())!=null){
				String[] p=line.split(";");
				if(p.length==2&&!p[0].isEmpty()){
					classTeacher.put(p[0],p[1]);
				}
			}
		}catch(IOException e){
			System.out.println("Ошибка чтения classteachers.txt: "+e.getMessage());
		}
	}
	static synchronized void saveClassTeachers(){
		StringBuilder sb=new StringBuilder();
		for(java.util.Map.Entry<String,String> e:classTeacher.entrySet()){
			sb.append(e.getKey()).append(";").append(e.getValue()).append("\n");
		}
		try{
			FileStorage.writeAtomic("classteachers.txt",sb.toString());
		}catch(IOException e){
			System.out.println("Ошибка записи classteachers.txt: "+e.getMessage());
		}
	}
	static synchronized void saveAccounts() {
		FileStorage.saveAccounts(new ArrayList<>(accounts.values()),"accounts.txt");
	}
	static synchronized void saveStudents() {
		FileStorage.saveStudents(new ArrayList<>(students.values()),"students.txt");
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
		if(classTeacher.remove(login)!=null) {
			saveClassTeachers();
		}
		saveAccounts();
		saveStudents();
	}
    public static void main(String[] args) {
        loadRegistry();
    }
}
