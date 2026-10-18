-- Create sentences table
CREATE TABLE sentences (
  id INT PRIMARY KEY,
  pidgin TEXT,
  english TEXT,
  level INT
);

-- Then insert all 100 (I go send full SQL for you)
INSERT INTO sentences VALUES (1, 'How far na?', 'How are you?', 1);
INSERT INTO sentences VALUES (2, 'I no dey gree for anybody', 'I dont agree', 1);
-- ... till 100