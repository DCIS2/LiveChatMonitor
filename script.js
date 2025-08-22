--- a/script.js
+++ b/script.js
@@ -1,7 +1,8 @@
-// Single pinned message
-let pinnedMessage = null;
+// Unlimited pinned messages
+let pinnedMessages = [];

 function togglePin(message) {
-  if (pinnedMessage && pinnedMessage.id === message.id) {
-    pinnedMessage = null;
+  const idx = pinnedMessages.findIndex(m => m.id === message.id);
+  if (idx !== -1) {
+    // Unpin
+    pinnedMessages.splice(idx, 1);
   } else {
-    pinnedMessage = message;
+    // Pin (no duplicates)
+    pinnedMessages.push(message);
   }
   renderPinnedMessages();
 }

@@ -40,10 +41,42 @@ function renderPinnedMessages() {
   const container = document.getElementById('pinned-container');
   container.innerHTML = '';

-  if (pinnedMessage) {
-    const div = createPinnedDiv(pinnedMessage);
-    container.appendChild(div);
-  }
+  // Loop through all pinned messages
+  pinnedMessages.forEach(msg => {
+    const div = document.createElement('div');
+    div.className = 'pinned-item';
+    div.dataset.id = msg.id;
+
+    // Text
+    const text = document.createElement('span');
+    text.textContent = msg.text;
+    div.appendChild(text);
+
+    // Copy icon
+    const copyBtn = document.createElement('span');
+    copyBtn.className = 'copy-icon';
+    copyBtn.title = 'Copy message';
+    copyBtn.innerHTML = '📋';
+    copyBtn.addEventListener('click', () => {
+      navigator.clipboard.writeText(msg.text)
+        .then(() => showCopyFeedback(copyBtn))
+        .catch(err => console.error('Copy failed', err));
+    });
+    div.appendChild(copyBtn);
+
+    container.appendChild(div);
+  });
+}

+/**
+ * Temporarily swap the copy icon to a checkmark and reset after 1.5s
+ */
+function showCopyFeedback(button) {
+  const origIcon = button.innerHTML;
+  const origTitle = button.title;
+
+  button.innerHTML = '✅';
+  button.title = 'Copied!';
+
+  setTimeout(() => {
+    button.innerHTML = origIcon;
+    button.title = origTitle;
+  }, 1500);
 }
