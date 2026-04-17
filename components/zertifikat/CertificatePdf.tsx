import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#18191d',
    padding: 60,
    fontFamily: 'Helvetica',
    color: '#f0f0f4',
  },
  container: {
    flex: 1,
    border: '1pt solid rgba(129,140,248,0.35)',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  academy: {
    fontSize: 9,
    color: '#818cf8',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: 'rgba(129,140,248,0.3)',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 11,
    color: '#9496ae',
    marginBottom: 4,
    textAlign: 'center',
  },
  program: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#818cf8',
    marginBottom: 32,
    textAlign: 'center',
  },
  awardedLabel: {
    fontSize: 8,
    color: '#52556b',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  userName: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#f0f0f4',
    marginBottom: 32,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 48,
    marginBottom: 32,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#f0f0f4',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 8,
    color: '#52556b',
  },
  dateLabel: {
    fontSize: 8,
    color: '#52556b',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 11,
    color: '#9496ae',
    marginBottom: 24,
  },
  footer: {
    fontSize: 9,
    color: 'rgba(129,140,248,0.45)',
  },
})

interface Props {
  userName: string
  completedAt: string
  avgScore: number
}

export default function CertificatePdf({ userName, completedAt, avgScore }: Props) {
  const date = new Date(completedAt).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Document
      title={`PILIH KI-Führerschein — ${userName}`}
      author="Yesterday Academy"
      subject="PILIH 21-Tage Prompt Engineering Zertifikat"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.container}>
          <Text style={styles.academy}>Yesterday Academy</Text>
          <View style={styles.divider} />

          <Text style={styles.subtitle}>Zertifikat über die erfolgreiche Absolvierung des</Text>
          <Text style={styles.program}>PILIH 21-Tage Prompt Engineering Programms</Text>

          <Text style={styles.awardedLabel}>Ausgestellt für</Text>
          <Text style={styles.userName}>{userName}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{avgScore.toFixed(1)}/10</Text>
              <Text style={styles.statLabel}>Durchschnittlicher Prompt-Score</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>21/21</Text>
              <Text style={styles.statLabel}>Challenges abgeschlossen</Text>
            </View>
          </View>

          <Text style={styles.dateLabel}>Ausstellungsdatum</Text>
          <Text style={styles.dateValue}>{date}</Text>

          <Text style={styles.footer}>Yesterday Academy — Prompt it like it&apos;s hot</Text>
        </View>
      </Page>
    </Document>
  )
}
