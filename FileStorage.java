import java.io.FileWriter;
import java.io.FileReader;
import java.io.BufferedReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
public class FileStorage {
    static synchronized void writeAtomic(String fileName,String content) throws IOException {
        java.nio.file.Path target=java.nio.file.Paths.get(fileName);
        java.nio.file.Path tmp=java.nio.file.Paths.get(fileName+".tmp");
        java.nio.file.Files.write(tmp,content.getBytes(StandardCharsets.UTF_8));
        try {
            java.nio.file.Files.move(tmp,target,java.nio.file.StandardCopyOption.REPLACE_EXISTING,
                java.nio.file.StandardCopyOption.ATOMIC_MOVE);
        } catch (java.nio.file.AtomicMoveNotSupportedException e) {
            java.nio.file.Files.move(tmp,target,java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        }
    }
    public static void saveStudents(ArrayList<Student> students,String fileName) {
        StringBuilder sb=new StringBuilder();
        for (Student s:students) {
            sb.append(s.getSurname()).append(":").append(s.getName()).append(":")
              .append(s.getClassName()).append(":").append(s.getStatus()).append(":")
              .append(s.getSchool()).append("\n");
        }
        try {
            writeAtomic(fileName,sb.toString());
            System.out.println("Сохранено в файл "+fileName);
        } catch (IOException e) {
            System.out.println("Ошибка записи: "+e.getMessage());
        }
    }
    public static ArrayList<Student> loadStudents(String fileName) {
        ArrayList<Student> students=new ArrayList<>();
        java.io.File file=new java.io.File(fileName);
        if(!file.exists()) {
            return students;
        }
        try (BufferedReader reader=new BufferedReader(
                new InputStreamReader(new FileInputStream(file),StandardCharsets.UTF_8))) {
            String line;
            while ((line=reader.readLine())!=null) {
                if(line.trim().isEmpty()) {
                    continue;
                }
                String[] parts=line.split(":",5);
                if(parts.length<3){
                    System.out.println("Пропуск строки в students.txt: "+line);
                    continue;
                }
                String surname=parts[0];
                String name=parts[1];
                String className=parts[2];
                RegistrationStatus status=RegistrationStatus.APPROVED;
                String school="";
                if(parts.length>=4) {
                    String p3=parts[3].trim();
                    String statusWord=null;
                    for(RegistrationStatus st:RegistrationStatus.values()) {
                        if(p3.startsWith(st.name())) {
                            statusWord=st.name();
                            break;
                        }
                    }
                    if(statusWord!=null) {
                        status=RegistrationStatus.valueOf(statusWord);
                        school=parts.length>4?parts[4].trim():p3.substring(statusWord.length()).trim();
                    } else {
                        school=p3;
                    }
                }
                students.add(new Student(name,surname,className,status,school));
            }
        } catch (IOException e) {
            System.out.println("Ошибка чтения: "+e.getMessage());
        }
        return students;
    }
    static List<Account> loadAccounts(String fileName) {
        List<Account> result=new ArrayList<>();
        java.io.File file=new java.io.File(fileName);
        if(!file.exists()) {
            return result;
        }
        try (BufferedReader reader=new BufferedReader(
                new InputStreamReader(new FileInputStream(file),StandardCharsets.UTF_8))) {
            String line;
            while ((line=reader.readLine())!=null) {
                if(line.trim().isEmpty()) {
                    continue;
                }
                String[] parts=line.split(":",6);
                if (parts.length<4) {
                    continue;
                }
                try {
                    Account acc=new Account(parts[0],Role.valueOf(parts[1]),parts[2],parts[3]);
                    String st=parts.length>4?parts[4].trim():"APPROVED";
                    acc.setApproved(st.startsWith("APPROVED"));
                    String school=parts.length>5?parts[5].trim():st.replaceFirst("^(APPROVED|PENDING)","").trim();
                    acc.setSchool(school);
                    result.add(acc);
                } catch (IllegalArgumentException e) {
                    System.out.println("Пропуск строки в accounts.txt (неизвестная роль): "+parts[0]);
                }
            }
        } catch (IOException e) {
            System.out.println("Ошибка чтения: " + e.getMessage());
        }
        return result;
    }
    static void saveAccounts(List<Account> accounts,String fileName) {
        StringBuilder sb=new StringBuilder();
        for (Account a:accounts) {
            sb.append(a.getLogin())
              .append(":").append(a.getRole())
              .append(":").append(a.getSalt())
              .append(":").append(a.getPasswordHash())
              .append(":").append(a.isApproved()?"APPROVED":"PENDING")
              .append(":").append(a.getSchool()).append("\n");
        }
        try {
            writeAtomic(fileName,sb.toString());
            System.out.println("Сохранено в файл "+fileName);
        } catch (IOException e) {
            System.out.println("Ошибка записи: " + e.getMessage());
        }
    }
	static synchronized void addAttendanceMark(String fullName,String answer,String reason) {
		String line=java.time.LocalDate.now()+";"+fullName+";"+answer+";"+reason+"\n";
		try{
			java.io.Writer w=new OutputStreamWriter(
				new FileOutputStream("attendance.txt",true),StandardCharsets.UTF_8);
			w.write(line);
			w.close();
			System.out.println("Отметка сохранена");
		}catch(IOException e) {
			System.out.println("Ошибка записи журнала"+e.getMessage());
		}
	}
	public static ArrayList<String> loadSchoolNames(String fileName) {
        ArrayList<String> schools=new ArrayList<>();
        try (BufferedReader reader=new BufferedReader(
                new InputStreamReader(new FileInputStream(fileName),StandardCharsets.UTF_8))) {
            String line;
            while ((line=reader.readLine())!=null) {
                for(String part:line.split("/")) {
                    String schoolName=part.trim();
                    if(!schoolName.isEmpty()) {
                        schools.add(schoolName);
                    }
                }
            }
        } catch (IOException e) {
            System.out.println("Ошибка чтения: "+e.getMessage());
        }
        return schools;
    }
}