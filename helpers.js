'use strict';

class Helpers {
    // 🔹 DATE FORMATTER
    static formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    // 🔹 PROGRESS BAR GENERATOR
    static getProgressBar(percentage) {
        const bars = Math.round(percentage / 10);
        return '█'.repeat(bars) + '░'.repeat(10 - bars);
    }

    // 🔹 COLORED PROGRESS BAR
    static getColoredProgressBar(percentage, colors) {
        const bars = Math.round(percentage / 10);
        const color = Helpers.getProgressColor(percentage, colors);
        return color + '█'.repeat(bars) + colors.dim + '░'.repeat(10 - bars) + colors.reset;
    }

    // 🔹 PROGRESS COLOR DETERMINER
    static getProgressColor(percentage, colors) {
        if (percentage >= 80) return colors.green;
        if (percentage >= 50) return colors.yellow;
        return colors.red;
    }

    // 🔹 STREAK TEXT FORMATTER
    static getStreakText(streak, colors, successFn) {
        return streak > 0 
            ? successFn(`${streak} hari berturut-turut`)
            : colors.dim + 'Belum ada streak' + colors.reset;
    }

    // 🔹 INPUT VALIDATOR
    static validateNumberInput(input, min, max) {
        const num = parseInt(input);
        return !isNaN(num) && num >= min && num <= max;
    }

    // 🔹 DATE NORMALIZER (set to start of day)
    static getStartOfDay(date) {
        const newDate = new Date(date);
        newDate.setHours(0, 0, 0, 0);
        return newDate;
    }

    // 🔹 CONSECUTIVE DAY CHECKER
    static isConsecutiveDay(compDate, currentDate, index) {
        const isSameDay = compDate.getTime() === currentDate.getTime();
        const isYesterday = index === 0 && 
            compDate.getTime() === currentDate.getTime() - 86400000;
        
        return isSameDay || isYesterday;
    }
}

module.exports = Helpers;