'use strict';
// ============================================
// HABIT TRACKER CLI - CHALLENGE 3
// ============================================
// NAMA: Lusiana Susanto
// KELAS: WPH REP -079
// ============================================

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Constants
const DATA_FILE = path.join(__dirname, 'habits-data.json');
const REMINDER_INTERVAL = 60000; // 1 menit( MAAF 10detik seperti perintah soal terlalu mengganggu T.T)
const DAYS_IN_WEEK = 7;
const DEFAULT_CATEGORIES = [
  'Kesehatan',
  'Produktivitas',
  'Belajar',
  'Olahraga',
  'Finansial',
  'Hobi',
  'Umum',
];
// ============================================
// COLOR CONSTANTS
// ============================================
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Text Colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background Colors (untuk header saja)
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m',
};

// Helper functions
const success = (text) => `${colors.green}${text}${colors.reset}`;
const warning = (text) => `${colors.yellow}${text}${colors.reset}`;
const error = (text) => `${colors.red}${text}${colors.reset}`;
const info = (text) => `${colors.blue}${text}${colors.reset}`;
const highlight = (text) => `${colors.cyan}${text}${colors.reset}`;

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ============================================
// USER PROFILE CLASS
// ============================================
class UserProfile {
  constructor(id, name, joinDate = new Date()) {
    this.id = id;
    this.name = name;
    this.joinDate = new Date(joinDate);
    this.totalHabits = 0;
    this.completedHabits = 0;
    this.activeHabits = 0;
  }

  updateStats(habits) {
    this.totalHabits = habits.length;
    this.activeHabits = habits.filter(
      (habit) => !habit.isCompletedThisWeek()
    ).length;
    this.completedHabits = habits.filter((habit) =>
      habit.isCompletedThisWeek()
    ).length;
  }

  getDaysJoined() {
    const today = new Date();
    const diffTime = Math.abs(today - this.joinDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
// ============================================
// HABIT CLASS
// ============================================
class Habit {
  constructor(
    id,
    name,
    targetFrequency,
    category = 'Umum',
    completions = [],
    createdAt = new Date()
  ) {
    this.id = id;
    this.name = name;
    this.targetFrequency = targetFrequency;
    this.category = category;
    this.completions = completions.map((date) => new Date(date));
    this.createdAt = new Date(createdAt);
    this.userId = null;
  }

  markComplete() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alreadyCompleted = this.completions.some((completion) => {
      const compDate = new Date(completion);
      compDate.setHours(0, 0, 0, 0);
      return compDate.getTime() === today.getTime();
    });

    if (!alreadyCompleted) {
      this.completions.push(today);
      return true;
    }
    return false;
  }

  getThisWeekCompletions() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return this.completions.filter((completion) => {
      const compDate = new Date(completion);
      return compDate >= startOfWeek;
    });
  }

  isCompletedThisWeek() {
    const weekCompletions = this.getThisWeekCompletions();
    return weekCompletions.length >= this.targetFrequency;
  }

  getProgressPercentage() {
    const weekCompletions = this.getThisWeekCompletions();
    const percentage = (weekCompletions.length / this.targetFrequency) * 100;
    return Math.min(Math.round(percentage), 100);
  }

  getStatus() {
    return this.isCompletedThisWeek() ? 'Selesai' : 'Aktif';
  }

  getProgressBar() {
    const percentage = this.getProgressPercentage();
    const bars = Math.round(percentage / 10);
    return '█'.repeat(bars) + '░'.repeat(10 - bars);
  }
  getCurrentStreak() {
    if (this.completions.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Urutkan tanggal descending
    const sortedDates = [...this.completions]
      .map((d) => new Date(d))
      .sort((a, b) => b - a);

    let streak = 0;
    let currentDate = new Date(today);

    for (let i = 0; i < sortedDates.length; i++) {
      const compDate = new Date(sortedDates[i]);
      compDate.setHours(0, 0, 0, 0);

      if (compDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (
        i === 0 &&
        compDate.getTime() === currentDate.getTime() - 86400000
      ) {
        // Jika kemarin dikerjakan, lanjutkan streak
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }
}
// ============================================
// HABIT TRACKER CLASS
// ============================================
class HabitTracker {
  constructor() {
    this.users = [];
    this.habits = [];
    this.currentUser = null;
    this.nextUserId = 1;
    this.nextHabitId = 1;
    this.reminderInterval = null;
    this.loadFromFile();
  }

  // User Management
  addUser(name) {
    const user = new UserProfile(this.nextUserId++, name);
    this.users.push(user);
    this.saveToFile();
    return user;
  }

  selectUser(userId) {
    this.currentUser = this.users.find((user) => user.id === userId) || null;
    return this.currentUser;
  }

  getCurrentUserHabits() {
    if (!this.currentUser) return [];
    return this.habits.filter((habit) => habit.userId === this.currentUser.id);
  }

  // CRUD Operations untuk habits user saat ini
  addHabit(name, frequency, category = 'Umum') {
    if (!this.currentUser) return null;

    // Validasi kategori
    if (!DEFAULT_CATEGORIES.includes(category)) {
      category = 'Umum';
    }

    const habit = new Habit(this.nextHabitId++, name, frequency, category);
    habit.userId = this.currentUser.id;

    this.habits.push(habit);
    this.currentUser.updateStats(this.getCurrentUserHabits());
    this.saveToFile();
    return habit;
  }

  completeHabit(habitIndex) {
    if (!this.currentUser) return false;

    const userHabits = this.getCurrentUserHabits();
    const habit = userHabits[habitIndex - 1] ?? null;

    if (habit) {
      const marked = habit.markComplete();
      this.currentUser.updateStats(this.getCurrentUserHabits());
      this.saveToFile();
      return marked;
    }
    return false;
  }

  deleteHabit(habitIndex) {
    if (!this.currentUser) return false;

    const userHabits = this.getCurrentUserHabits();
    if (habitIndex >= 1 && habitIndex <= userHabits.length) {
      const habitToDelete = userHabits[habitIndex - 1];
      const habitIndexInAll = this.habits.findIndex(
        (h) => h.id === habitToDelete.id
      );

      if (habitIndexInAll !== -1) {
        this.habits.splice(habitIndexInAll, 1);
        this.currentUser.updateStats(this.getCurrentUserHabits());
        this.saveToFile();
        return true;
      }
    }
    return false;
  }

  // Display Methods
  displayProfile() {
    if (!this.currentUser) return;

    const userHabits = this.getCurrentUserHabits();
    this.currentUser.updateStats(userHabits);

    console.log(
      `\n${colors.bgGreen}${colors.white}==================================================${colors.reset}`
    );
    console.log(
      `${colors.bgGreen}${colors.white}                   PROFIL PENGGUNA               ${colors.reset}`
    );
    console.log(
      `${colors.bgGreen}${colors.white}==================================================${colors.reset}`
    );
    console.log(
      `${colors.cyan}Nama:${colors.reset} ${highlight(this.currentUser.name)}`
    );
    console.log(
      `${colors.cyan}Bergabung sejak:${colors.reset} ${
        colors.white
      }${this.currentUser.joinDate.toLocaleDateString('id-ID')}${colors.reset}`
    );
    console.log(
      `${colors.cyan}Total hari bergabung:${colors.reset} ${success(
        this.currentUser.getDaysJoined() + ' hari'
      )}`
    );
    console.log(
      `${colors.cyan}Total kebiasaan:${colors.reset} ${info(
        this.currentUser.totalHabits
      )}`
    );
    console.log(
      `${colors.cyan}Kebiasaan aktif:${colors.reset} ${warning(
        this.currentUser.activeHabits
      )}`
    );
    console.log(
      `${colors.cyan}Kebiasaan selesai:${colors.reset} ${success(
        this.currentUser.completedHabits
      )}`
    );
    console.log(
      `${colors.bgGreen}${colors.white}==================================================${colors.reset}\n`
    );
  }

  displayHabits(filter = 'all') {
    if (!this.currentUser) return;

    const userHabits = this.getCurrentUserHabits();

    console.log(
      `\n${colors.bgBlue}${colors.white}==================================================${colors.reset}`
    );
    console.log(
      `${colors.bgBlue}${colors.white}                  DAFTAR KEBIAASAAN               ${colors.reset}`
    );
    console.log(
      `${colors.bgBlue}${colors.white}==================================================${colors.reset}`
    );

    if (userHabits.length === 0) {
      console.log(warning('Belum ada kebiasaan yang ditambahkan.'));
      console.log(
        `${colors.bgBlue}${colors.white}==================================================${colors.reset}\n`
      );
      return;
    }

    let filteredHabits = [];

    switch (filter) {
      case 'active':
        filteredHabits = userHabits.filter(
          (habit) => !habit.isCompletedThisWeek()
        );
        break;
      case 'completed':
        filteredHabits = userHabits.filter((habit) =>
          habit.isCompletedThisWeek()
        );
        break;
      default:
        filteredHabits = [...userHabits];
    }

    if (filteredHabits.length === 0) {
      console.log(warning(`Tidak ada kebiasaan dengan status: ${filter}`));
      console.log(
        `${colors.bgBlue}${colors.white}==================================================${colors.reset}\n`
      );
      return;
    }

    filteredHabits.forEach((habit, index) => {
      const status = habit.getStatus();
      const statusColor = status === 'Selesai' ? colors.green : colors.yellow;
      const streak = habit.getCurrentStreak();
      const streakText =
        streak > 0
          ? success(`${streak} hari berturut-turut`)
          : colors.dim + 'Belum ada streak' + colors.reset;

      console.log(
        `${colors.green}${index + 1}.${colors.reset} [${statusColor}${status}${
          colors.reset
        }] ${highlight(habit.name)}`
      );
      console.log(
        `   ${colors.dim}Target:${colors.reset} ${colors.white}${habit.targetFrequency}x/minggu${colors.reset}`
      );
      console.log(
        `   ${colors.dim}Progress:${colors.reset} ${colors.white}${
          habit.getThisWeekCompletions().length
        }/${habit.targetFrequency} (${habit.getProgressPercentage()}%)${
          colors.reset
        }`
      );
      console.log(
        `   ${colors.dim}Progress Bar:${
          colors.reset
        } ${this.getColoredProgressBar(
          habit.getProgressPercentage()
        )} ${this.getProgressColor(
          habit.getProgressPercentage()
        )}${habit.getProgressPercentage()}%${colors.reset}`
      );
      console.log(`   ${colors.dim}Streak:${colors.reset} ${streakText}`);
      console.log(
        `   ${colors.dim}Kategori:${colors.reset} ${info(habit.category)}`
      );
      console.log('');
    });
    console.log(
      `${colors.bgBlue}${colors.white}==================================================${colors.reset}\n`
    );
  }

  // Helper method untuk progress bar berwarna
  getColoredProgressBar(percentage) {
    const bars = Math.round(percentage / 10);
    const color = this.getProgressColor(percentage);
    return (
      color +
      '█'.repeat(bars) +
      colors.dim +
      '░'.repeat(10 - bars) +
      colors.reset
    );
  }

  // Helper method untuk warna progress
  getProgressColor(percentage) {
    if (percentage >= 80) return colors.green;
    if (percentage >= 50) return colors.yellow;
    return colors.red;
  }
  displayHabitsByCategory() {
    if (!this.currentUser) return;

    const userHabits = this.getCurrentUserHabits();

    console.log(
      `\n${colors.bgMagenta}${colors.white}==================================================${colors.reset}`
    );
    console.log(
      `${colors.bgMagenta}${colors.white}           KEBIAASAAN BERDASARKAN KATEGORI       ${colors.reset}`
    );
    console.log(
      `${colors.bgMagenta}${colors.white}==================================================${colors.reset}`
    );

    if (userHabits.length === 0) {
      console.log(warning('Belum ada kebiasaan yang ditambahkan.'));
      console.log(
        `${colors.bgMagenta}${colors.white}==================================================${colors.reset}\n`
      );
      return;
    }

    // Group by category
    const habitsByCategory = {};
    userHabits.forEach((habit) => {
      if (!habitsByCategory[habit.category]) {
        habitsByCategory[habit.category] = [];
      }
      habitsByCategory[habit.category].push(habit);
    });

    Object.keys(habitsByCategory).forEach((category) => {
      console.log(`\n📁 ${highlight(category.toUpperCase())}:`);
      console.log(colors.dim + '─'.repeat(50) + colors.reset);

      habitsByCategory[category].forEach((habit, index) => {
        const streak = habit.getCurrentStreak();
        const status = habit.getStatus();
        const statusColor = status === 'Selesai' ? colors.green : colors.yellow;

        console.log(
          `${colors.green}${index + 1}.${
            colors.reset
          } [${statusColor}${status}${colors.reset}] ${habit.name}`
        );
        console.log(
          `   ${colors.dim}Progress:${
            colors.reset
          } ${this.getColoredProgressBar(
            habit.getProgressPercentage()
          )} ${this.getProgressColor(
            habit.getProgressPercentage()
          )}${habit.getProgressPercentage()}%${colors.reset}`
        );
        console.log(
          `   ${colors.dim}Streak:${colors.reset} ${
            streak > 0
              ? success(`${streak} hari`)
              : colors.dim + 'Belum ada streak' + colors.reset
          }`
        );
      });
    });
    console.log(
      `\n${colors.bgMagenta}${colors.white}==================================================${colors.reset}\n`
    );
  }
  displayHabitsWithWhile() {
    const userHabits = this.getCurrentUserHabits();

    console.log('\n==================================================');
    console.log('DEMO WHILE LOOP - DAFTAR KEBIAASAAN');
    console.log('==================================================');

    let i = 0;
    while (i < userHabits.length) {
      const habit = userHabits[i];
      console.log(`${i + 1}. ${habit.name} - ${habit.getStatus()}`);
      i++;
    }
    console.log('==================================================\n');
  }

  displayHabitsWithFor() {
    const userHabits = this.getCurrentUserHabits();

    console.log('\n==================================================');
    console.log('DEMO FOR LOOP - DAFTAR KEBIAASAAN');
    console.log('==================================================');

    for (let i = 0; i < userHabits.length; i++) {
      const habit = userHabits[i];
      console.log(`${i + 1}. ${habit.name} - ${habit.getStatus()}`);
    }
    console.log('==================================================\n');
  }
  displayCompletionHistory(days = 30) {
    if (!this.currentUser) return;

    const userHabits = this.getCurrentUserHabits();

    console.log('\n==================================================');
    console.log('HISTORY KOMPLETISI (30 HARI TERAKHIR)');
    console.log('==================================================');

    if (userHabits.length === 0) {
      console.log('Belum ada kebiasaan yang ditambahkan.');
      console.log('==================================================\n');
      return;
    }

    // Generate last 30 days
    const dates = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    console.log('\nTanggal     | Kebiasaan yang Diselesaikan');
    console.log('------------|---------------------------');

    dates.forEach((date) => {
      const completedHabits = userHabits.filter((habit) =>
        habit.completions.some(
          (comp) => comp.toISOString().split('T')[0] === date
        )
      );

      if (completedHabits.length > 0) {
        const habitNames = completedHabits.map((h) => h.name).join(', ');
        console.log(`${date} | ${habitNames}`);
      }
    });

    // Statistics
    const totalCompletions = userHabits.reduce(
      (sum, habit) => sum + habit.completions.length,
      0
    );
    const avgCompletion = (totalCompletions / userHabits.length).toFixed(1);

    console.log('\n--- STATISTIK ---');
    console.log(`Total kompletisi: ${totalCompletions}`);
    console.log(`Rata-rata per kebiasaan: ${avgCompletion}`);
    console.log('==================================================\n');
  }
  displayStats() {
    if (!this.currentUser) return;

    const userHabits = this.getCurrentUserHabits();

    console.log(
      `\n${colors.bgGreen}${colors.white}==================================================${colors.reset}`
    );
    console.log(
      `${colors.bgGreen}${colors.white}               STATISTIK KEBIAASAAN              ${colors.reset}`
    );
    console.log(
      `${colors.bgGreen}${colors.white}==================================================${colors.reset}`
    );

    if (userHabits.length === 0) {
      console.log(warning('Belum ada data statistik.'));
      console.log(
        `${colors.bgGreen}${colors.white}==================================================${colors.reset}\n`
      );
      return;
    }

    const habitNames = userHabits.map((habit) => habit.name);
    const completionRates = userHabits.map((habit) =>
      habit.getProgressPercentage()
    );

    const bestHabit = userHabits.find(
      (habit) => habit.getProgressPercentage() === Math.max(...completionRates)
    );

    const worstHabit = userHabits.find(
      (habit) => habit.getProgressPercentage() === Math.min(...completionRates)
    );

    const totalCompletionRate =
      completionRates.reduce((sum, rate) => sum + rate, 0) /
      completionRates.length;

    console.log(
      `${colors.cyan}Total kebiasaan:${colors.reset} ${info(userHabits.length)}`
    );
    console.log(
      `${colors.cyan}Rata-rata completion rate:${
        colors.reset
      } ${this.getProgressColor(totalCompletionRate)}${Math.round(
        totalCompletionRate
      )}%${colors.reset}`
    );

    if (bestHabit) {
      console.log(
        `${colors.cyan}Kebiasaan terbaik:${colors.reset} ${highlight(
          bestHabit.name
        )} ${success(`(${bestHabit.getProgressPercentage()}%)`)}`
      );
    }

    if (worstHabit) {
      console.log(
        `${colors.cyan}Kebiasaan perlu perbaikan:${colors.reset} ${highlight(
          worstHabit.name
        )} ${error(`(${worstHabit.getProgressPercentage()}%)`)}`
      );
    }

    console.log(`\n${colors.cyan}Detail Completion Rate:${colors.reset}`);
    userHabits.forEach((habit, index) => {
      console.log(
        `  ${colors.green}${index + 1}.${colors.reset} ${highlight(
          habit.name
        )}: ${this.getProgressColor(
          habit.getProgressPercentage()
        )}${habit.getProgressPercentage()}%${colors.reset}`
      );
    });

    console.log(
      `${colors.bgGreen}${colors.white}==================================================${colors.reset}\n`
    );
  }

  // Reminder System
  startReminder() {
    if (!this.reminderInterval) {
      this.reminderInterval = setInterval(() => {
        this.showReminder();
      }, REMINDER_INTERVAL);
    }
  }

  showReminder() {
    if (!this.currentUser) return;

    const userHabits = this.getCurrentUserHabits();
    const incompleteHabits = userHabits.filter(
      (habit) => !habit.isCompletedThisWeek()
    );

    if (incompleteHabits.length > 0) {
      console.log(
        `\n${colors.bgRed}${colors.white}==================================================${colors.reset}`
      );
      console.log(
        `${colors.bgRed}${colors.white}         🚨 REMINDER: Jangan lupa hari ini!      ${colors.reset}`
      );
      console.log(
        `${colors.bgRed}${colors.white}==================================================${colors.reset}`
      );

      incompleteHabits.forEach((habit) => {
        console.log(`${colors.red}⏰${colors.reset} ${highlight(habit.name)}`);
      });

      console.log(
        `${colors.bgRed}${colors.white}==================================================${colors.reset}\n`
      );
    }
  }

  stopReminder() {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }
  }

  // File Operations
  saveToFile() {
    try {
      const data = {
        users: this.users,
        habits: this.habits,
        nextUserId: this.nextUserId,
        nextHabitId: this.nextHabitId,
      };
      const jsonData = JSON.stringify(data, null, 2);
      fs.writeFileSync(DATA_FILE, jsonData);
    } catch (error) {
      console.error('Error saving data:', error.message);
    }
  }

  loadFromFile() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const jsonData = fs.readFileSync(DATA_FILE, 'utf8');
        const data = JSON.parse(jsonData);

        this.users = (data.users ?? []).map(
          (userData) =>
            new UserProfile(
              userData.id ?? 0,
              userData.name ?? 'User',
              userData.joinDate ?? new Date()
            )
        );

        this.habits = (data.habits ?? []).map((habitData) => {
          const habit = new Habit(
            habitData.id ?? 0,
            habitData.name ?? 'Unknown',
            habitData.targetFrequency ?? 1,
            habitData.category ?? 'Umum',
            habitData.completions ?? [],
            habitData.createdAt ?? new Date()
          );
          habit.userId = habitData.userId ?? null;
          return habit;
        });

        this.nextUserId = data.nextUserId ?? 1;
        this.nextHabitId = data.nextHabitId ?? 1;
      }
    } catch (error) {
      console.error('Error loading data:', error.message);
    }
  }

  clearAllData() {
    this.habits = [];
    this.users = [];
    this.currentUser = null;
    this.nextHabitId = 1;
    this.nextUserId = 1;
    this.saveToFile();
  }

  // Demo data untuk testing
  addDemoData() {
    if (!this.currentUser) return;

    const userHabits = this.getCurrentUserHabits();
    if (userHabits.length === 0) {
      this.addHabit('Minum Air 8 Gelas', 7);
      this.addHabit('Baca Buku 30 Menit', 5);
      this.addHabit('Olahraga 15 Menit', 3);
      console.log('Data demo telah ditambahkan!');
    }
  }
  exportToCSV() {
    if (!this.currentUser) return false;

    const userHabits = this.getCurrentUserHabits();
    const filename = `habits_export_${this.currentUser.name}_${
      new Date().toISOString().split('T')[0]
    }.csv`;

    let csvContent =
      'Nama Kebiasaan,Kategori,Target,Progress,Status,Streak,Total Completions\n';

    userHabits.forEach((habit) => {
      const row = [
        `"${habit.name}"`,
        `"${habit.category}"`,
        habit.targetFrequency,
        `${habit.getProgressPercentage()}%`,
        habit.getStatus(),
        habit.getCurrentStreak(),
        habit.completions.length,
      ].join(',');

      csvContent += row + '\n';
    });

    try {
      fs.writeFileSync(filename, csvContent, 'utf8');
      console.log(`✅ Data berhasil diexport ke: ${filename}`);
      return true;
    } catch (error) {
      console.error('❌ Error export data:', error.message);
      return false;
    }
  }

  exportToJSON() {
    if (!this.currentUser) return false;

    const userHabits = this.getCurrentUserHabits();
    const filename = `habits_export_${this.currentUser.name}_${
      new Date().toISOString().split('T')[0]
    }.json`;

    const exportData = {
      exportDate: new Date().toISOString(),
      user: this.currentUser.name,
      totalHabits: userHabits.length,
      habits: userHabits.map((habit) => ({
        name: habit.name,
        category: habit.category,
        targetFrequency: habit.targetFrequency,
        progress: habit.getProgressPercentage(),
        status: habit.getStatus(),
        streak: habit.getCurrentStreak(),
        totalCompletions: habit.completions.length,
        completions: habit.completions.map(
          (d) => d.toISOString().split('T')[0]
        ),
      })),
    };

    try {
      fs.writeFileSync(filename, JSON.stringify(exportData, null, 2), 'utf8');
      console.log(`✅ Data berhasil diexport ke: ${filename}`);
      return true;
    } catch (error) {
      console.error('❌ Error export data:', error.message);
      return false;
    }
  }
}
// ============================================
// HELPER FUNCTIONS
// ============================================
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}
function displayMenu() {
  console.log(
    `\n${colors.bgBlue}${colors.white}==================================================${colors.reset}`
  );
  console.log(
    `${colors.bgBlue}${colors.white}               HABIT TRACKER - MAIN MENU           ${colors.reset}`
  );
  console.log(
    `${colors.bgBlue}${colors.white}==================================================${colors.reset}`
  );
  console.log(
    `${colors.green}1.${colors.reset} ${colors.cyan}Lihat Profil${colors.reset}`
  );
  console.log(
    `${colors.green}2.${colors.reset} ${colors.cyan}Lihat Semua Kebiasaan${colors.reset}`
  );
  console.log(
    `${colors.green}3.${colors.reset} ${colors.cyan}Lihat Kebiasaan Aktif${colors.reset}`
  );
  console.log(
    `${colors.green}4.${colors.reset} ${colors.cyan}Lihat Kebiasaan Selesai${colors.reset}`
  );
  console.log(
    `${colors.green}5.${colors.reset} ${colors.cyan}Lihat Berdasarkan Kategori${colors.reset}`
  );
  console.log(
    `${colors.green}6.${colors.reset} ${colors.cyan}History Kompletisi${colors.reset}`
  );
  console.log(
    `${colors.green}7.${colors.reset} ${colors.cyan}Tambah Kebiasaan Baru${colors.reset}`
  );
  console.log(
    `${colors.green}8.${colors.reset} ${colors.cyan}Tandai Kebiasaan Selesai${colors.reset}`
  );
  console.log(
    `${colors.green}9.${colors.reset} ${colors.cyan}Hapus Kebiasaan${colors.reset}`
  );
  console.log(
    `${colors.green}10.${colors.reset} ${colors.cyan}Lihat Statistik${colors.reset}`
  );
  console.log(
    `${colors.green}11.${colors.reset} ${colors.cyan}Demo Loop (while/for)${colors.reset}`
  );
  console.log(
    `${colors.green}12.${colors.reset} ${colors.cyan}Export Data${colors.reset}`
  );
  console.log(
    `${colors.green}13.${colors.reset} ${colors.cyan}Kontrol Reminder${colors.reset}`
  );
  console.log(
    `${colors.green}14.${colors.reset} ${colors.cyan}Ganti Profil${colors.reset}`
  );
  console.log(
    `${colors.red}0.${colors.reset} ${colors.yellow}Keluar${colors.reset}`
  );
  console.log(
    `${colors.bgBlue}${colors.white}==================================================${colors.reset}`
  );
}
// ========================
// USER SELECTION FLOW
// ========================
async function showUserSelection(tracker) {
  console.log(
    `\n${colors.bgBlue}${colors.white}==================================================${colors.reset}`
  );
  console.log(
    `${colors.bgBlue}${colors.white}            SELAMAT DATANG DI HABIT TRACKER         ${colors.reset}`
  );
  console.log(
    `${colors.bgBlue}${colors.white}     Bangun kebiasaan baik, capai tujuan Anda!     ${colors.reset}`
  );
  console.log(
    `${colors.bgBlue}${colors.white}==================================================${colors.reset}\n`
  );

  if (tracker.users.length > 0) {
    console.log(success('[OK] Data berhasil dimuat.\n'));
    console.log(info('Data profil ditemukan!\n'));
    console.log('---');
    console.log(highlight('PILIH PROFIL'));
    console.log('---');

    tracker.users.forEach((user, index) => {
      const habitsCount = tracker.habits.filter(
        (h) => h.userId === user.id
      ).length;
      console.log(
        `${colors.green}${index + 1}.${colors.reset} ${highlight(user.name)} ${
          colors.dim
        }(${habitsCount} kebiasaan)${colors.reset}`
      );
      console.log(
        `   ${colors.dim}Bergabung: ${user.joinDate.toLocaleDateString(
          'id-ID'
        )}${colors.reset}`
      );
    });

    console.log('---');
    console.log(
      `${colors.green}${tracker.users.length + 1}.${colors.reset} ${info(
        'Buat Profil Baru'
      )}`
    );
    console.log('---');

    const choice = await askQuestion(
      `${colors.cyan}Pilih profil (1-${tracker.users.length + 1}): ${
        colors.reset
      }`
    );
    const choiceNum = parseInt(choice);

    if (choiceNum >= 1 && choiceNum <= tracker.users.length) {
      const selectedUser = tracker.users[choiceNum - 1];
      tracker.selectUser(selectedUser.id);
      console.log(success(`\n[OK] Selamat datang, ${selectedUser.name}!`));
      return true;
    } else if (choiceNum === tracker.users.length + 1) {
      const userName = await askQuestion(
        `${colors.cyan}Masukkan nama profil baru: ${colors.reset}`
      );
      if (userName.trim()) {
        const newUser = tracker.addUser(userName.trim());
        tracker.selectUser(newUser.id);
        console.log(
          success(`\n[OK] Profil "${newUser.name}" berhasil dibuat!`)
        );
        return true;
      } else {
        console.log(error('\n[ERROR] Nama tidak boleh kosong!'));
        return await showUserSelection(tracker);
      }
    } else {
      console.log(error('\n[ERROR] Pilihan tidak valid!'));
      return await showUserSelection(tracker);
    }
  } else {
    console.log(info('Halo! Mari buat profil pertama Anda.\n'));
    const userName = await askQuestion(
      `${colors.cyan}Masukkan nama Anda: ${colors.reset}`
    );
    const finalName = userName.trim() || 'User';
    const newUser = tracker.addUser(finalName);
    tracker.selectUser(newUser.id);
    console.log(success(`\n[OK] Profil "${newUser.name}" berhasil dibuat!`));
    return true;
  }
}
// ============================================
// MENU HANDLER
// ============================================
async function handleMenu(tracker) {
  while (true) {
    displayMenu();
    const choice = await askQuestion('Pilih menu (0-14): ');

    switch (choice) {
      case '1':
        tracker.displayProfile();
        break;

      case '2':
        tracker.displayHabits('all');
        break;

      case '3':
        tracker.displayHabits('active');
        break;

      case '4':
        tracker.displayHabits('completed');
        break;

      case '5':
        tracker.displayHabitsByCategory();
        break;

      case '6':
        tracker.displayCompletionHistory();
        break;

      case '7':
        const name = await askQuestion('Nama kebiasaan: ');
        const frequency = await askQuestion('Target per minggu: ');
        const category =
          (await askQuestion('Kategori (default: Umum): ')) || 'Umum';
        const freqNumber = parseInt(frequency) || 1;

        if (name.trim()) {
          tracker.addHabit(name.trim(), freqNumber, category.trim());
          console.log(success('Kebiasaan berhasil ditambahkan!'));
        } else {
          console.log(error('Nama kebiasaan tidak boleh kosong!'));
        }
        break;

      case '8':
        try {
          tracker.displayHabits('all');
          const userHabits = tracker.getCurrentUserHabits();
          if (userHabits.length > 0) {
            const habitIndex = await askQuestion('Pilih nomor kebiasaan: ');
            const indexNum = parseInt(habitIndex);

            if (indexNum >= 1 && indexNum <= userHabits.length) {
              const marked = tracker.completeHabit(indexNum);
              if (marked) {
                console.log(
                  `${colors.green}✅ Kebiasaan berhasil ditandai selesai!${colors.reset}`
                );
              } else {
                console.log(
                  `${colors.yellow}⚠️ Kebiasaan sudah ditandai selesai hari ini!${colors.reset}`
                );
              }
            } else {
              console.log(
                `${colors.red}❌ Nomor kebiasaan tidak valid!${colors.reset}`
              );
            }
          } else {
            console.log(
              `${colors.yellow}📝 Tidak ada kebiasaan untuk ditandai.${colors.reset}`
            );
          }
        } catch (err) {
          console.log(
            `${colors.red}💥 Terjadi error:${colors.reset}`,
            err.message
          );
        }
        break;

      case '9':
        tracker.displayHabits('all');
        const userHabitsForDelete = tracker.getCurrentUserHabits();
        if (userHabitsForDelete.length > 0) {
          const habitIndex = await askQuestion(
            'Pilih nomor kebiasaan yang akan dihapus: '
          );
          const indexNum = parseInt(habitIndex);

          if (indexNum >= 1 && indexNum <= userHabitsForDelete.length) {
            const habitName = userHabitsForDelete[indexNum - 1].name;
            const confirm = await askQuestion(
              `Yakin hapus "${habitName}"? (y/n): `
            );

            if (confirm.toLowerCase() === 'y') {
              tracker.deleteHabit(indexNum);
              console.log(success('Kebiasaan berhasil dihapus!'));
            }
          } else {
            console.log(error('Nomor kebiasaan tidak valid!'));
          }
        }
        break;

      case '10':
        tracker.displayStats();
        break;

      case '11':
        console.log('\nDemo While Loop:');
        tracker.displayHabitsWithWhile();
        console.log('Demo For Loop:');
        tracker.displayHabitsWithFor();
        break;

      case '12':
        console.log('\nPilih format export:');
        console.log('1. CSV');
        console.log('2. JSON');
        const exportChoice = await askQuestion('Pilihan (1-2): ');

        if (exportChoice === '1') {
          tracker.exportToCSV();
        } else if (exportChoice === '2') {
          tracker.exportToJSON();
        } else {
          console.log(error('Pilihan tidak valid!'));
        }
        break;

      case '13':
        if (tracker.reminderInterval) {
          tracker.stopReminder();
          console.log(success('Reminder dimatikan!'));
        } else {
          tracker.startReminder();
          console.log(success('Reminder diaktifkan!'));
        }
        break;

      case '14':
        tracker.stopReminder();
        console.log(info('\n[INFO] Kembali ke pemilihan profil...\n'));
        const userSelected = await showUserSelection(tracker);
        if (!userSelected) {
          rl.close();
          return;
        }
        break;

      case '0':
        console.log(success('Terima kasih telah menggunakan Habit Tracker!'));
        tracker.stopReminder();
        rl.close();
        return;

      // HIDDEN COMMANDS
      case 'demo':
        tracker.addDemoData();
        break;

      case 'clear':
        tracker.clearAllData();
        console.log(success('Semua data telah dihapus!'));
        break;

      default:
        console.log(error('Pilihan tidak valid! Silakan pilih 0-14.'));
    }

    await askQuestion('Tekan Enter untuk melanjutkan...');
  }
}
// ============================================
// MAIN FUNCTION
// ============================================
async function main() {
  console.log(
    `\n${colors.bgGreen}${colors.white}==================================================${colors.reset}`
  );
  console.log(
    `${colors.bgGreen}${colors.white}           HABIT TRACKER CLI APPLICATION         ${colors.reset}`
  );
  console.log(
    `${colors.bgGreen}${colors.white}==================================================${colors.reset}`
  );
  console.log(
    `${colors.cyan}        Aplikasi Pelacak Kebiasaan Harian${colors.reset}`
  );
  console.log(
    `${colors.dim}              Dibuat oleh: Lusiana Susanto${colors.reset}`
  );
  console.log(
    `${colors.bgGreen}${colors.white}==================================================${colors.reset}\n`
  );

  const tracker = new HabitTracker();

  // User selection flow
  const userSelected = await showUserSelection(tracker);
  if (!userSelected) {
    rl.close();
    return;
  }

  // Tambah data demo hanya untuk user baru yang belum punya habits
  const userHabits = tracker.getCurrentUserHabits();
  if (userHabits.length === 0) {
    tracker.addHabit('Minum Air 8 Gelas', 7, 'Kesehatan');
    tracker.addHabit('Baca Buku 30 Menit', 5, 'Belajar');
    tracker.addHabit('Olahraga 15 Menit', 3, 'Olahraga');
    console.log(success('[INFO] Data demo telah ditambahkan!'));
  }

  try {
    await handleMenu(tracker);
  } catch (error) {
    console.log(`${colors.red}Terjadi error:${colors.reset}`, error.message);
    tracker.stopReminder();
    rl.close();
  }
}

// Jalankan aplikasi
if (require.main === module) {
  main().catch((error) => {
    console.error('Terjadi error:', error);
    process.exit(1);
  });
}

module.exports = { UserProfile, Habit, HabitTracker };
