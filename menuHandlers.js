'use strict';

class MenuHandlers {
  constructor(
    tracker,
    colors,
    success,
    error,
    warning,
    info,
    highlight,
    askQuestion,
    showUserSelection
  ) {
    this.tracker = tracker;
    this.colors = colors;
    this.success = success;
    this.error = error;
    this.warning = warning;
    this.info = info;
    this.highlight = highlight;
    this.askQuestion = askQuestion;
    this.showUserSelection = showUserSelection;
  }

  // 🔹 HANDLER: Tambah Habit Baru
  async handleAddHabit() {
    const name = await this.askQuestion('Nama kebiasaan: ');
    const frequency = await this.askQuestion('Target per minggu: ');
    const category =
      (await this.askQuestion('Kategori (default: Umum): ')) || 'Umum';
    const freqNumber = parseInt(frequency) || 1;

    if (name.trim()) {
      this.tracker.addHabit(name.trim(), freqNumber, category.trim());
      console.log(this.success('Kebiasaan berhasil ditambahkan!'));
    } else {
      console.log(this.error('Nama kebiasaan tidak boleh kosong!'));
    }
  }

  // 🔹 HANDLER: Tandai Habit Selesai
  async handleCompleteHabit() {
    try {
      this.tracker.displayHabits('all');
      const userHabits = this.tracker.getCurrentUserHabits();

      if (userHabits.length === 0) {
        console.log(this.warning('Tidak ada kebiasaan untuk ditandai.'));
        return;
      }

      const habitIndex = await this.askQuestion('Pilih nomor kebiasaan: ');
      const indexNum = parseInt(habitIndex);

      await this.processHabitCompletion(indexNum, userHabits);
    } catch (err) {
      console.log(this.error('Terjadi error:'), err.message);
    }
  }

  // 🔹 HELPER: Process Completion
  async processHabitCompletion(indexNum, userHabits) {
    if (indexNum >= 1 && indexNum <= userHabits.length) {
      const marked = this.tracker.completeHabit(indexNum);
      if (marked) {
        console.log(this.success('Kebiasaan berhasil ditandai selesai!'));
      } else {
        console.log(this.warning('Kebiasaan sudah ditandai selesai hari ini!'));
      }
    } else {
      console.log(this.error('Nomor kebiasaan tidak valid!'));
    }
  }

  // 🔹 HANDLER: Hapus Habit
  async handleDeleteHabit() {
    this.tracker.displayHabits('all');
    const userHabits = this.tracker.getCurrentUserHabits();

    if (userHabits.length === 0) {
      console.log(this.warning('Tidak ada kebiasaan untuk dihapus.'));
      return;
    }

    const habitIndex = await this.askQuestion(
      'Pilih nomor kebiasaan yang akan dihapus: '
    );
    const indexNum = parseInt(habitIndex);

    await this.processHabitDeletion(indexNum, userHabits);
  }

  // 🔹 HELPER: Process Deletion
  async processHabitDeletion(indexNum, userHabits) {
    if (indexNum >= 1 && indexNum <= userHabits.length) {
      const habitName = userHabits[indexNum - 1].name;
      const confirm = await this.askQuestion(
        `Yakin hapus "${habitName}"? (y/n): `
      );

      if (confirm.toLowerCase() === 'y') {
        this.tracker.deleteHabit(indexNum);
        console.log(this.success('Kebiasaan berhasil dihapus!'));
      }
    } else {
      console.log(this.error('Nomor kebiasaan tidak valid!'));
    }
  }

  // 🔹 HANDLER: Export Data
  async handleExportData() {
    console.log('\nPilih format export:');
    console.log('1. CSV');
    console.log('2. JSON');
    const exportChoice = await this.askQuestion('Pilihan (1-2): ');

    if (exportChoice === '1') {
      this.tracker.exportToCSV();
    } else if (exportChoice === '2') {
      this.tracker.exportToJSON();
    } else {
      console.log(this.error('Pilihan tidak valid!'));
    }
  }

 
}

module.exports = MenuHandlers;
