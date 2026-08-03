import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../providers/journal_provider.dart';
import 'journal_screen.dart';
import 'login_screen.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(journalProvider.notifier).loadEntries();
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final journalState = ref.watch(journalProvider);
    final userName = authState.userData?['fullName'] ?? 'Explorer';

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('Hola, $userName', style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFF64748B)),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (mounted) {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(journalProvider.notifier).loadEntries();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Astro Energy Card (Banner)
              _buildEnergyBanner(),
              const SizedBox(height: 20),

              // 2. Stats Row (Streaks, Level, Points)
              Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      'RACHA / STREAK',
                      '${journalState.lastStreakInfo?['streakDays'] ?? 0} días',
                      Icons.local_fire_department,
                      const Color(0xFFF59E0B),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildStatCard(
                      'NIVEL / LEVEL',
                      'Lvl ${journalState.lastStreakInfo?['level'] ?? 1}',
                      Icons.insights,
                      const Color(0xFF8B5CF6),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),

              // 3. Section Title: Journals
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'DIARIO Y REFLEXIONES / JOURNAL',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF94A3B8),
                      letterSpacing: 1,
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const JournalScreen()),
                      );
                    },
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Registrar / Log'),
                    style: TextButton.styleFrom(foregroundColor: const Color(0xFF8B5CF6)),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // 4. Journals list
              if (journalState.isLoading)
                const Center(child: Padding(padding: EdgeInsets.all(24.0), child: CircularProgressIndicator()))
              else if (journalState.entries.isEmpty)
                _buildEmptyState()
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: journalState.entries.length,
                  itemBuilder: (context, index) {
                    final entry = journalState.entries[index];
                    return _buildJournalCard(entry);
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEnergyBanner() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(
          colors: [
            const Color(0xFF8B5CF6).withOpacity(0.3),
            const Color(0xFFEC4899).withOpacity(0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: const Color(0xFF8B5CF6).withOpacity(0.2)),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.nights_stay_outlined, color: Color(0xFFEC4899), size: 20),
              SizedBox(width: 8),
              Text(
                'ENERGÍA DIARIA / DAILY ENERGY',
                style: TextStyle(
                  color: Color(0xFFEC4899),
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
          SizedBox(height: 12),
          Text(
            'Fase Lunar: Creciente. Tu intuición está expandiéndose hoy. Excelente día para registrar tus sueños.',
            style: TextStyle(color: Colors.white, fontSize: 15, height: 1.4),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF161822),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
              Icon(icon, color: color, size: 18),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      decoration: BoxDecoration(
        color: const Color(0xFF161822),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          const Icon(Icons.edit_note, size: 48, color: Color(0xFF475569)),
          const SizedBox(height: 16),
          const Text(
            'Tu diario está vacío / Your journal is empty',
            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white70),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          const Text(
            'Escribe tu primera reflexión o sueño para activar tu racha y recibir análisis de IA.',
            style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const JournalScreen()),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF8B5CF6)),
            child: const Text('Crear Entrada / Create Entry', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _buildJournalCard(dynamic entry) {
    final String type = entry['entryType'] ?? 'mood';
    final int mood = entry['moodRating'] ?? 5;
    final String text = entry['content'] ?? '';
    final String date = entry['createdAt'] != null
        ? DateTime.parse(entry['createdAt']).toLocal().toString().substring(0, 10)
        : '';
    final Map<String, dynamic>? analysis = entry['aiAnalysis'];

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF161822),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: type == 'dream' ? const Color(0xFF8B5CF6).withOpacity(0.2) : const Color(0xFF0D9488).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  type.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: type == 'dream' ? const Color(0xFFA78BFA) : const Color(0xFF2DD4BF),
                  ),
                ),
              ),
              Text(date, style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
            ],
          ),
          const SizedBox(height: 12),
          Text(text, style: const TextStyle(color: Colors.white, height: 1.4)),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.mood, size: 14, color: Color(0xFFF59E0B)),
              const SizedBox(width: 4),
              Text('Humor: $mood/10', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
            ],
          ),
          if (analysis != null && analysis['emotional_summary'] != null) ...[
            const Divider(color: Color(0xFF334155), height: 24),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.auto_awesome, size: 14, color: Color(0xFFEC4899)),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    analysis['emotional_summary'],
                    style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Color(0xFF94A3B8)),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
