#!/usr/bin/env node

/**
 * Скрипт для создания Kafka топиков согласно контрактам
 */

import { Kafka } from 'kafkajs';
import { KafkaTopics } from '@iot-hub/contracts-kafka';

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';

const kafka = new Kafka({
  clientId: 'topic-creator',
  brokers: [KAFKA_BROKER],
});

const admin = kafka.admin();

async function createTopics() {
  try {
    console.log('🔗 Подключение к Kafka...');
    await admin.connect();

    // Получаем все топики из контрактов
    const topicsToCreate = Object.values(KafkaTopics).map((topic) => ({
      topic,
      numPartitions: 3, // 3 партиции для балансировки нагрузки
      replicationFactor: 1, // 1 для development, в production должно быть 3
      configEntries: [
        {
          name: 'cleanup.policy',
          value: 'delete',
        },
        {
          name: 'retention.ms',
          value: '604800000', // 7 дней
        },
        {
          name: 'max.message.bytes',
          value: '1048576', // 1MB
        },
      ],
    }));

    console.log(`📝 Создание ${topicsToCreate.length} топиков...`);

    // Проверяем какие топики уже существуют
    const existingTopics = await admin.listTopics();
    const topicsToCreateFiltered = topicsToCreate.filter(
      (t) => !existingTopics.includes(t.topic)
    );

    if (topicsToCreateFiltered.length === 0) {
      console.log('✅ Все топики уже существуют');
      return;
    }

    // Создаем недостающие топики
    const created = await admin.createTopics({
      topics: topicsToCreateFiltered,
    });

    if (created) {
      console.log('✅ Топики успешно созданы:');
      topicsToCreateFiltered.forEach((topic) => {
        console.log(`   - ${topic.topic}`);
      });
    } else {
      console.log('⚠️  Некоторые топики уже существовали');
    }

    console.log('\n📋 Все доступные топики:');
    const allTopics = await admin.listTopics();
    allTopics.sort().forEach((topic) => {
      console.log(`   - ${topic}`);
    });
  } catch (error) {
    console.error('❌ Ошибка при создании топиков:', error);
    process.exit(1);
  } finally {
    await admin.disconnect();
    console.log('\n🔌 Отключение от Kafka');
  }
}

// Запуск
createTopics()
  .then(() => {
    console.log('🎉 Инициализация топиков завершена');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
