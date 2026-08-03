import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'presentation/screens/login_screen.dart';

void main() {
  runApp(
    const ProviderScope(
      child: MysticApp(),
    ),
  );
}

class MysticApp extends StatelessWidget {
  const MysticApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mystic Premium',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0C0D12), // Deep slate black
        primaryColor: const Color(0xFF8B5CF6), // Warm Violet
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF8B5CF6),
          secondary: Color(0xFFEC4899), // Neon pink accents
          surface: Color(0xFF161822), // Warm card surface
          background: Color(0xFF0C0D12),
        ),
        textTheme: const TextTheme(
          displayLarge: TextStyle(fontSize: 32.0, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: -1.0),
          titleLarge: TextStyle(fontSize: 20.0, fontWeight: FontWeight.bold, color: Colors.white),
          bodyLarge: TextStyle(fontSize: 16.0, color: Color(0xFF94A3B8)), // Slate grey text
          bodyMedium: TextStyle(fontSize: 14.0, color: Color(0xFF64748B)),
        ),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}
