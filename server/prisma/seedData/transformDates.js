const fs = require('fs');
const path = require('path');

const projectPath = path.join(__dirname, 'project.json');
const taskPath = path.join(__dirname, 'task.json');

const getRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const constrainDate = (dateString) => {
  if (!dateString) return dateString;
  const date = new Date(dateString);
  const month = date.getMonth(); // 0 is Jan, 3 is Apr

  if (month >= 0 && month <= 3) {
    // Jan, Feb, Mar, Apr -> Keep month/day, update year to 2026
    date.setFullYear(2026);
    return date.toISOString();
  } else {
    // Map to random fallback between Jan 1, 2026 and Apr 30, 2026
    const start = new Date(Date.UTC(2026, 0, 1));
    const end = new Date(Date.UTC(2026, 3, 30, 23, 59, 59));
    return getRandomDate(start, end).toISOString();
  }
};

const transformFile = (filePath) => {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const transformed = data.map(item => {
    if (item.startDate) item.startDate = constrainDate(item.startDate);
    if (item.endDate) item.endDate = constrainDate(item.endDate);
    if (item.dueDate) item.dueDate = constrainDate(item.dueDate);
    return item;
  });
  fs.writeFileSync(filePath, JSON.stringify(transformed, null, 2));
  console.log(`Transformed dates in ${path.basename(filePath)}`);
};

transformFile(projectPath);
transformFile(taskPath);
console.log("Date transformation complete.");
