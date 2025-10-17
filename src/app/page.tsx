import ReminderClient from "./reminder-client";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Postür Hatırlatıcı</h1>
        <p>
          Bu site, her 30 dakikada bir bildirim göstererek dik oturmanı
          hatırlatır.
        </p>
        <ReminderClient />
      </main>
      <footer className={styles.footer}>
        <span style={{ color: "#94a3b8", fontSize: 14 }}>
          powered by <span style={{ fontWeight: 600 }}>Yagnur</span> ❤️
        </span>
      </footer>
    </div>
  );
}
