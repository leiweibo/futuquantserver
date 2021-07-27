struct User {
  1: i32 uid,
  2: string name,
  3: string age,
  4: string sex
}

service UserStorage {
  void addUser(1: User user),
  User getUser(1: i32 uid)
}