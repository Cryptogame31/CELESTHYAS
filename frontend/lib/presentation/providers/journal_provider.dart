import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repositories/journal_repository.dart';

class JournalState {
  final List<dynamic> entries;
  final bool isLoading;
  final String? errorMessage;
  final Map<String, dynamic>? lastStreakInfo;

  JournalState({
    this.entries = const [],
    this.isLoading = false,
    this.errorMessage,
    this.lastStreakInfo,
  });

  JournalState copyWith({
    List<dynamic>? entries,
    bool? isLoading,
    String? errorMessage,
    Map<String, dynamic>? lastStreakInfo,
  }) {
    return JournalState(
      entries: entries ?? this.entries,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      lastStreakInfo: lastStreakInfo ?? this.lastStreakInfo,
    );
  }
}

class JournalNotifier extends StateNotifier<JournalState> {
  final JournalRepository _repository;

  JournalNotifier(this._repository) : super(JournalState());

  Future<void> loadEntries() async {
    state = state.copyWith(isLoading: true);
    final list = await _repository.fetchEntries();
    state = JournalState(entries: list);
  }

  Future<bool> addEntry(String content, String entryType, int moodRating) async {
    state = state.copyWith(isLoading: true);
    final result = await _repository.createEntry(content, entryType, moodRating);
    if (result != null) {
      final updatedList = [result['journal'], ...state.entries];
      state = JournalState(
        entries: updatedList,
        lastStreakInfo: result['gamification'],
      );
      return true;
    } else {
      state = state.copyWith(isLoading: false, errorMessage: 'Error al enviar entrada / Failed to post entry.');
      return false;
    }
  }
}

final journalRepositoryProvider = Provider((ref) => JournalRepository());

final journalProvider = StateNotifierProvider<JournalNotifier, JournalState>((ref) {
  final repo = ref.watch(journalRepositoryProvider);
  return JournalNotifier(repo);
});
