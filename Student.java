class Student {
    private String surName;
    private String name;
    private RegistrationStatus status;
	private String className;
	private String school="";
    public Student(String name,String surName,String className,RegistrationStatus status) {
        this.name=name;
        this.surName=surName;
		this.className=className;
        this.status=status;
    }
	public Student(String name,String surName,String className,RegistrationStatus status,String school) {
		this(name,surName,className,status);
		this.school=school==null?"":school;
	}
    public Student(String name,String surName,String className) {this(name,surName,className,RegistrationStatus.PENDING);}
	public Student(String name,String surName) {this(name,surName,"",RegistrationStatus.PENDING);}
    public Student(String name) {this(name,"","",RegistrationStatus.PENDING);}
    public Student(String name,RegistrationStatus status) {this(name,"","",status);}
	public String getClassName() {return className;}
    public String fullName() {return surName+" "+name;}
    public String getName() {return name;}
	public String getSurname() {return surName;}
    public RegistrationStatus getStatus() {return status;}
    public void setStatus(RegistrationStatus newStatus) {this.status = newStatus;}
	public String getSchool(){return school;}
    public String toJson() {
		return "{\"name\": \""+Adsum.jsonEsc(name)+"\",\"surname\":\""+Adsum.jsonEsc(surName)
			+"\",\"class\":\""+Adsum.jsonEsc(className)+"\",\"status\":\""+status+"\"}";
	}
}
