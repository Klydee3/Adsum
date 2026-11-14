import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Питательные комплексы столовой и меню по дням. Каждая запись привязана к школе.
// complexes.txt: id TAB школа TAB название TAB блюдо|блюдо|...
// menudays.txt:  дата TAB школа TAB id,id,...
class Complex {
    final int id;
    final String school;
    final String name;
    final List<String> dishes;
    Complex(int id,String school,String name,List<String> dishes) {
        this.id=id;
        this.school=school;
        this.name=name;
        this.dishes=dishes;
    }
    String toJson() {
        StringBuilder sb=new StringBuilder("{\"id\":").append(id)
            .append(",\"name\":\"").append(Adsum.jsonEsc(name)).append("\",\"dishes\":[");
        for(int i=0;i<dishes.size();i++) {
            if(i>0) {
                sb.append(",");
            }
            sb.append("\"").append(Adsum.jsonEsc(dishes.get(i))).append("\"");
        }
        return sb.append("]}").toString();
    }
}
class Menu {
    static final String COMPLEX_FILE="complexes.txt";
    static final String DAYS_FILE="menudays.txt";
    static final List<Complex> complexes=new ArrayList<>();
    static final Map<String,List<Integer>> days=new HashMap<>();
    static int nextId=1;
    static String dayKey(String date,String school) {
        return date+"\t"+school;
    }
    static boolean cleanText(String v,int max) {
        return v!=null&&!v.isEmpty()&&v.length()<=max
            &&v.indexOf('|')<0&&v.indexOf('\t')<0&&v.indexOf('\n')<0&&v.indexOf('\r')<0;
    }
    static synchronized void load() {
        complexes.clear();
        days.clear();
        nextId=1;
        for(String line:readLines(COMPLEX_FILE)) {
            String[] p=line.split("\t",4);
            if(p.length<4) {
                continue;
            }
            try {
                int id=Integer.parseInt(p[0]);
                List<String> dishes=new ArrayList<>();
                for(String d:p[3].split("\\|")) {
                    if(!d.trim().isEmpty()) {
                        dishes.add(d.trim());
                    }
                }
                complexes.add(new Complex(id,p[1],p[2],dishes));
                nextId=Math.max(nextId,id+1);
            } catch(NumberFormatException e) {
                System.out.println("Пропуск строки в "+COMPLEX_FILE+": "+line);
            }
        }
        for(String line:readLines(DAYS_FILE)) {
            String[] p=line.split("\t",3);
            if(p.length<3) {
                continue;
            }
            List<Integer> ids=new ArrayList<>();
            for(String s:p[2].split(",")) {
                try {
                    ids.add(Integer.parseInt(s.trim()));
                } catch(NumberFormatException ignored) {
                }
            }
            days.put(dayKey(p[0],p[1]),ids);
        }
    }
    static List<String> readLines(String fileName) {
        List<String> lines=new ArrayList<>();
        File f=new File(fileName);
        if(!f.exists()) {
            return lines;
        }
        try(BufferedReader r=new BufferedReader(new InputStreamReader(new FileInputStream(f),StandardCharsets.UTF_8))) {
            String line;
            while((line=r.readLine())!=null) {
                if(!line.trim().isEmpty()) {
                    lines.add(line);
                }
            }
        } catch(IOException e) {
            System.out.println("Ошибка чтения "+fileName+": "+e.getMessage());
        }
        return lines;
    }
    static void save() {
        StringBuilder c=new StringBuilder();
        for(Complex x:complexes) {
            c.append(x.id).append("\t").append(x.school).append("\t").append(x.name).append("\t")
             .append(String.join("|",x.dishes)).append("\n");
        }
        StringBuilder d=new StringBuilder();
        for(Map.Entry<String,List<Integer>> e:days.entrySet()) {
            StringBuilder ids=new StringBuilder();
            for(int id:e.getValue()) {
                if(ids.length()>0) {
                    ids.append(",");
                }
                ids.append(id);
            }
            d.append(e.getKey()).append("\t").append(ids).append("\n");
        }
        try {
            FileStorage.writeAtomic(COMPLEX_FILE,c.toString());
            FileStorage.writeAtomic(DAYS_FILE,d.toString());
        } catch(IOException e) {
            System.out.println("Ошибка записи меню: "+e.getMessage());
        }
    }
    static synchronized List<Complex> complexesOf(String school) {
        List<Complex> r=new ArrayList<>();
        for(Complex x:complexes) {
            if(x.school.equals(school)) {
                r.add(x);
            }
        }
        return r;
    }
    // Комплекс возвращается только если он принадлежит указанной школе
    static synchronized Complex find(int id,String school) {
        for(Complex x:complexes) {
            if(x.id==id&&x.school.equals(school)) {
                return x;
            }
        }
        return null;
    }
    static synchronized Complex add(String school,String name,List<String> dishes) {
        Complex x=new Complex(nextId++,school,name,dishes);
        complexes.add(x);
        save();
        return x;
    }
    static synchronized boolean delete(int id,String school) {
        Complex x=find(id,school);
        if(x==null) {
            return false;
        }
        complexes.remove(x);
        for(List<Integer> ids:days.values()) {
            ids.remove(Integer.valueOf(id));
        }
        days.values().removeIf(List::isEmpty);
        save();
        return true;
    }
    static synchronized void setDay(String date,String school,List<Integer> ids) {
        if(ids.isEmpty()) {
            days.remove(dayKey(date,school));
        } else {
            days.put(dayKey(date,school),new ArrayList<>(ids));
        }
        save();
    }
    // Меню на день только для одной школы: чужие комплексы в выдачу не попадают
    static synchronized List<Complex> menuFor(String date,String school) {
        List<Complex> r=new ArrayList<>();
        List<Integer> ids=days.get(dayKey(date,school));
        if(ids==null) {
            return r;
        }
        for(int id:ids) {
            Complex x=find(id,school);
            if(x!=null) {
                r.add(x);
            }
        }
        return r;
    }
}
