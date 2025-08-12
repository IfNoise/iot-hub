/**
 * ACM Database Schema
 *
 * Экспортирует только ACM-специфичные схемы из shared библиотеки
 * Исключает таблицы devices и certificates, которые не используются в ACM
 */

// Экспортируем ACM-специфичную схему
export * from './acm-schema.js';
