import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class JournalRepository {
  final String _baseUrl = 'http://localhost:3001/api/v1/journals';
  final _storage = const FlutterSecureStorage();

  Future<List<dynamic>> fetchEntries() async {
    final token = await _storage.read(key: 'access_token');
    if (token == null) return [];

    try {
      final response = await http.get(
        Uri.parse(_baseUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as List<dynamic>;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>?> createEntry(String content, String entryType, int moodRating) async {
    final token = await _storage.read(key: 'access_token');
    if (token == null) return null;

    try {
      final response = await http.post(
        Uri.parse(_baseUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'content': content,
          'entryType': entryType,
          'moodRating': moodRating,
        }),
      );

      if (response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
