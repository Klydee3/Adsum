public class Account {
    private String login;
    private Role role;
    private String salt;
    private String passwordHash;
	private boolean approved;
	private String school="";
	private String className="";
	private java.util.LinkedHashSet<String> subjects=new java.util.LinkedHashSet<>();
    public Account(String login,Role role,String salt,String passwordHash) {
        this.login=login;
        this.role=role;
        this.salt=salt;
        this.passwordHash=passwordHash;
    }
    public String getLogin(){return login;}
    public Role getRole(){return role;}
    public String getSalt(){return salt;}
    public String getPasswordHash(){return passwordHash;}
    public void setSalt(String salt){this.salt=salt;}
    public void setPasswordHash(String passwordHash){this.passwordHash=passwordHash;}
	public boolean isApproved(){return approved;}
	public void setApproved(boolean approved){this.approved=approved;}
	public String getSchool(){return school;}
	public void setSchool(String school){this.school=school==null?"":school;}
	public java.util.Set<String> getSubjects(){return java.util.Collections.unmodifiableSet(subjects);}
	public boolean teaches(String subject){return subjects.contains(subject);}
	public void setSubjects(java.util.Collection<String> list){
		subjects.clear();
		if(list!=null){
			for(String s:list){
				if(s!=null&&!s.trim().isEmpty()){subjects.add(s.trim());}
			}
		}
	}
	public String getClassName(){return className;}
	public void setClassName(String className){this.className=className==null?"":className;}
}
