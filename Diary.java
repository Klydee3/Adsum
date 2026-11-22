import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;

class Grade {
    final String school;
    final String date;
    final String subject;
    final String student;
    final int mark;
    final String comment;
    final String teacher;
    Grade(String school,String date,String subject,String student,int mark,String comment,String teacher) {
        this.school=school;
        this.date=date;
        this.subject=subject;
        this.student=student;
        this.mark=mark;
        this.comment=comment;
        this.teacher=teacher;
    }
    String toJson() {
        return "{\"subject\":\""+Adsum.jsonEsc(subject)+"\",\"mark\":"+mark
            +",\"comment\":\""+Adsum.jsonEsc(comment)+"\"}";
    }
}
class Homework {
    final String school;
    final String className;
    final String date;
    final String subject;
    final String text;
    final String teacher;
    Homework(String school,String className,String date,String subject,String text,String teacher) {
        this.school=school;
        this.className=className;
        this.date=date;
        this.subject=subject;
        this.text=text;
        this.teacher=teacher;
    }
    String toJson() {
        return "{\"subject\":\""+Adsum.jsonEsc(subject)+"\",\"text\":\""+Adsum.jsonEsc(text)+"\"}";
    }
}
class Diary {
    static final String GRADES_FILE="grades.txt";
    static final String HOMEWORK_FILE="homework.txt";
    static final int MAX_MARK=10;
    static final Map<String,Grade> grades=new LinkedHashMap<>();
    static final Map<String,Homework> homework=new LinkedHashMap<>();
    static class Entry {
        final String student;
        final int mark;
        final String comment;
        Entry(String student,int mark,String comment) {
            this.student=student;
            this.mark=mark;
            this.comment=comment;
        }
    }
    static boolean cleanLine(String v,int max) {
        return v!=null&&v.length()<=max&&v.indexOf('\t')<0&&v.indexOf('\n')<0&&v.indexOf('\r')<0;
    }
    static String gradeKey(String school,String date,String subject,String student) {
        return school+"\t"+date+"\t"+subject+"\t"+student;
    }
    static String homeworkKey(String school,String className,String date,String subject) {
        return school+"\t"+className+"\t"+date+"\t"+subject;
    }
    static synchronized void load() {
        grades.clear();
        homework.clear();
        for(String line:Menu.readLines(GRADES_FILE)) {
            String[] p=line.split("\t",7);
            if(p.length<7) {
                continue;
            }
            try {
                grades.put(gradeKey(p[0],p[1],p[2],p[3]),
                    new Grade(p[0],p[1],p[2],p[3],Integer.parseInt(p[4]),p[5],p[6]));
            } catch(NumberFormatException e) {
                System.out.println("Пропуск строки в "+GRADES_FILE+": "+line);
            }
        }
        for(String line:Menu.readLines(HOMEWORK_FILE)) {
            String[] p=line.split("\t",6);
            if(p.length<6) {
                continue;
            }
            homework.put(homeworkKey(p[0],p[1],p[2],p[3]),new Homework(p[0],p[1],p[2],p[3],p[4],p[5]));
        }
    }
    static void save() {
        StringBuilder g=new StringBuilder();
        for(Grade x:grades.values()) {
            g.append(x.school).append("\t").append(x.date).append("\t").append(x.subject).append("\t")
             .append(x.student).append("\t").append(x.mark).append("\t").append(x.comment).append("\t")
             .append(x.teacher).append("\n");
        }
        StringBuilder h=new StringBuilder();
        for(Homework x:homework.values()) {
            h.append(x.school).append("\t").append(x.className).append("\t").append(x.date).append("\t")
             .append(x.subject).append("\t").append(x.text).append("\t").append(x.teacher).append("\n");
        }
        try {
            FileStorage.writeAtomic(GRADES_FILE,g.toString());
            FileStorage.writeAtomic(HOMEWORK_FILE,h.toString());
        } catch(IOException e) {
            System.out.println("Ошибка записи дневника: "+e.getMessage());
        }
    }
    static synchronized void apply(String school,String className,String date,String subject,String text,
            String teacher,List<Entry> entries) {
        for(Entry e:entries) {
            String key=gradeKey(school,date,subject,e.student);
            if(e.mark==0) {
                grades.remove(key);
            } else {
                grades.put(key,new Grade(school,date,subject,e.student,e.mark,e.comment,teacher));
            }
        }
        String key=homeworkKey(school,className,date,subject);
        if(text.isEmpty()) {
            homework.remove(key);
        } else {
            homework.put(key,new Homework(school,className,date,subject,text,teacher));
        }
        save();
    }
    static synchronized Grade gradeOf(String school,String date,String subject,String student) {
        return grades.get(gradeKey(school,date,subject,student));
    }
    static synchronized Homework homeworkOf(String school,String className,String date,String subject) {
        return homework.get(homeworkKey(school,className,date,subject));
    }
    static synchronized List<Grade> gradesOn(String school,String student,String date) {
        List<Grade> r=new ArrayList<>();
        for(Grade g:grades.values()) {
            if(g.school.equals(school)&&g.student.equals(student)&&g.date.equals(date)) {
                r.add(g);
            }
        }
        r.sort((a,b)->a.subject.compareTo(b.subject));
        return r;
    }
    static synchronized List<Homework> homeworkOn(String school,String className,String date) {
        List<Homework> r=new ArrayList<>();
        for(Homework h:homework.values()) {
            if(h.school.equals(school)&&h.className.equals(className)&&h.date.equals(date)) {
                r.add(h);
            }
        }
        r.sort((a,b)->a.subject.compareTo(b.subject));
        return r;
    }
    static synchronized Map<String,double[]> averages(String school,String student) {
        Map<String,double[]> r=new TreeMap<>();
        for(Grade g:grades.values()) {
            if(!g.school.equals(school)||!g.student.equals(student)) {
                continue;
            }
            double[] a=r.get(g.subject);
            if(a==null) {
                a=new double[2];
                r.put(g.subject,a);
            }
            a[0]+=g.mark;
            a[1]++;
        }
        return r;
    }
    static synchronized TreeSet<String> subjectsOf(String school) {
        TreeSet<String> r=new TreeSet<>();
        for(Grade g:grades.values()) {
            if(g.school.equals(school)) {
                r.add(g.subject);
            }
        }
        for(Homework h:homework.values()) {
            if(h.school.equals(school)) {
                r.add(h.subject);
            }
        }
        return r;
    }
}
