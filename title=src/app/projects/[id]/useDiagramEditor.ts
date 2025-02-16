@@ handleGenerateDiagram function (near line 70)
-      // Store the prompt for later retries.
-      setLastPrompt(promptText);
-      setIsGenerating(true);
-      setError('');
+      // Store the prompt for later retries.
+      setLastPrompt(promptText);
+      setPrompt(''); // ← Clear the input box immediately after sending
+      setIsGenerating(true);
+      setError('');
@@ After final diagram rendering (near the end of the function)
-         if (prompt) setPrompt('');
+         // Removed redundant clearing of the prompt here.