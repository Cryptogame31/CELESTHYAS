import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/journal_provider.dart';

class JournalScreen extends ConsumerStatefulWidget {
  const JournalScreen({super.key});

  @override
  ConsumerState<JournalScreen> createState() => _JournalScreenState();
}

class _JournalScreenState extends ConsumerState<JournalScreen> {
  final _contentController = TextEditingController();
  double _moodRating = 5;
  String _entryType = 'mood';

  @override
  Widget build(BuildContext context) {
    final journalState = ref.watch(journalProvider);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Nueva Reflexión / New Entry', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Dropdown Selector for Type
            const Text(
              '¿Qué tipo de registro es? / Category',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: const Color(0xFF161822),
                borderRadius: BorderRadius.circular(8),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _entryType,
                  dropdownColor: const Color(0xFF161822),
                  items: const [
                    DropdownMenuItem(value: 'mood', child: Text('Estado de Ánimo / Mood Log')),
                    DropdownMenuItem(value: 'dream', child: Text('Sueño / Dream Journal')),
                    DropdownMenuItem(value: 'gratitude', child: Text('Gratitud / Gratitude')),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _entryType = val;
                      });
                    }
                  },
                ),
              ),
            ),
            const SizedBox(height: 24),

            // 2. Mood Rating Slider
            Text(
              'Humor actual / Current Mood: ${_moodRating.toInt()}/10',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF161822),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Slider(
                value: _moodRating,
                min: 1,
                max: 10,
                divisions: 9,
                activeColor: const Color(0xFF8B5CF6),
                inactiveColor: const Color(0xFF334155),
                onChanged: (val) {
                  setState(() {
                    _moodRating = val;
                  });
                },
              ),
            ),
            const SizedBox(height: 24),

            // 3. Journal Content text field
            const Text(
              '¿Qué estás sintiendo o qué soñaste? / Content',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _contentController,
              maxLines: 8,
              decoration: InputDecoration(
                hintText: 'Escribe tus pensamientos libremente aquí... / Write your thoughts freely here...',
                filled: true,
                fillColor: const Color(0xFF161822),
                hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFF8B5CF6), width: 1.5),
                ),
              ),
            ),
            const SizedBox(height: 32),

            if (journalState.errorMessage != null) ...[
              Text(
                journalState.errorMessage!,
                style: const TextStyle(color: Colors.redAccent, fontSize: 13),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
            ],

            // 4. Save Button
            ElevatedButton(
              onPressed: journalState.isLoading
                  ? null
                  : () async {
                      final content = _contentController.text.trim();
                      if (content.isEmpty) return;

                      final success = await ref
                          .read(journalProvider.notifier)
                          .addEntry(content, _entryType, _moodRating.toInt());

                      if (success && mounted) {
                        Navigator.pop(context);
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF8B5CF6),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                elevation: 0,
              ),
              child: journalState.isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text(
                      'GUARDAR Y ANALIZAR / SAVE & ANALYZE',
                      style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
