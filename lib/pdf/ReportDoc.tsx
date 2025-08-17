/* @jsxImportSource react */
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ReportPayload } from './buildReportPayload';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11 },
  h1: { fontSize: 18, marginBottom: 8, fontWeight: 700 },
  h2: { fontSize: 14, marginTop: 12, marginBottom: 6, fontWeight: 700 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  table: { marginTop: 8, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 6 },
  cell: { flex: 1 },
  meta: { marginTop: 8 },
  small: { fontSize: 9, color: '#444' },
});

export default function ReportDoc({ data }: { data: ReportPayload }) {
  const en = data.report.language === 'en';
  const T = (en
    ? {
        title: 'Sustainability Report (VSME)',
        org: 'Organization',
        period: 'Reporting period',
        totals: 'Totals (kgCO₂e)',
        scope1: 'Scope 1',
        scope2: 'Scope 2',
        total: 'Total',
        activities: 'Activity Data',
        meta: 'Methodology & Metadata',
        framework: 'Framework',
        frameworkVersion: 'Framework Version',
        factorsVersion: 'Factors Version',
        traceLines: 'Computation trace lines',
      }
    : {
        title: 'Rapport de durabilite (VSME)',
        org: 'Organisation',
        period: 'Periode de reporting',
        totals: 'Totaux (kgCO₂e)',
        scope1: 'Scope 1',
        scope2: 'Scope 2',
        total: 'Total',
        activities: 'Donnees d\'activite',
        meta: 'Methodologie & Metadonnees',
        framework: 'Cadre',
        frameworkVersion: 'Version du cadre',
        factorsVersion: 'Version des facteurs',
        traceLines: 'Lignes de tracabilite de calcul',
      });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{T.title}</Text>
        <View style={styles.row}>
          <Text>{T.org}: {data.organization.name}</Text>
          <Text>{T.period}: {data.report.periodStart} → {data.report.periodEnd}</Text>
        </View>

        <Text style={styles.h2}>{T.totals}</Text>
        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={styles.cell}>{T.scope1}</Text>
            <Text style={styles.cell}>{Math.round(data.totals.scope1Kg)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cell}>{T.scope2}</Text>
            <Text style={styles.cell}>{Math.round(data.totals.scope2Kg)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cell}>{T.total}</Text>
            <Text style={styles.cell}>{Math.round(data.totals.totalKg)}</Text>
          </View>
        </View>

        <Text style={styles.h2}>{T.activities}</Text>
        <View style={styles.table}>
          {data.activities.map((a, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.cell}>{a.kind}</Text>
              <Text style={styles.cell}>{a.value} {a.unit}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>{T.meta}</Text>
        <View style={styles.meta}>
          <Text style={styles.small}>{T.framework}: {data.report.framework}</Text>
          <Text style={styles.small}>{T.frameworkVersion}: {data.report.frameworkVersion}</Text>
          <Text style={styles.small}>{T.factorsVersion}: {data.factorsVersion}</Text>
          <Text style={styles.small}>{T.traceLines}: {data.traceCount}</Text>
        </View>
      </Page>
    </Document>
  );
}
