package com.hdlee.pdfnote;

import java.io.File;
import java.nio.file.Files;
import java.util.Arrays;

/**
 * Runs the Android app's DeviceSync server (HDnotes/app/src/main/java/com/hdlee/pdfnote/DeviceSync.java) on this machine for
 * dev/sync-test.mjs. Library = args[0] (PDFs), assets = args[1] (images / recordings, and the notes as note-<path with / as _>.json).
 * "open.pdf" counts as open in the app. Prints "<port> <code>". See docs/device-sync.md.
 */
public class DeviceSyncHarness {
    public static void main(String[] args) throws Exception {
        final File lib = new File(args[0]), assets = new File(args[1]);
        DeviceSync s = new DeviceSync(new DeviceSync.Host() {
            File note(String p) { return new File(assets, "note-" + p.replace('/', '_') + ".json"); }
            void collect(File d, String pre, StringBuilder sb) {
                File[] l = d.listFiles(); if (l == null) return; Arrays.sort(l);
                for (File f : l) {
                    if (f.getName().startsWith(".")) continue;
                    String rel = pre + f.getName();
                    if (f.isDirectory()) { collect(f, rel + "/", sb); continue; }
                    if (!rel.endsWith(".pdf")) continue;
                    if (sb.length() > 1) sb.append(',');
                    sb.append("{\"path\":").append(DeviceSync.quote(rel)).append(",\"size\":").append(f.length())
                      .append(",\"mtime\":").append(Math.max(f.lastModified(), note(rel).lastModified())).append('}');
                }
            }
            public String listLibrary() { StringBuilder sb = new StringBuilder("["); collect(lib, "", sb); return sb.append(']').toString(); }
            public boolean isOpen(String p) { return p.equals("open.pdf"); }
            public File libraryFile(String p) {
                if (p == null || p.isEmpty() || !p.endsWith(".pdf") || p.startsWith("/") || p.contains("\\")) return null;
                for (String part : p.split("/", -1)) if (part.isEmpty() || part.equals(".") || part.equals("..") || part.startsWith(".")) return null;
                return new File(lib, p);
            }
            public String exportNote(String p) throws Exception {
                if (!new File(lib, p).isFile()) return null;
                File n = note(p); return n.isFile() ? new String(Files.readAllBytes(n.toPath()), "UTF-8") : "{\"format\":\"PDF Note annotations v2\",\"elements\":[]}";
            }
            public void importNote(String p, String json) throws Exception { Files.write(note(p).toPath(), json.getBytes("UTF-8")); }
            public File assetFile(String name) { return new File(assets, name); }
            public void onActivity(String m) { }
            public String deviceName() { return "Test \"Phone\""; }
            public String deviceId() { return "test-phone-1"; }
            public String appVersion() { return "1.1.0"; }
        });
        s.start();
        System.out.println(s.port() + " " + s.code());
        System.out.flush();
        Thread.sleep(Long.MAX_VALUE);
    }
}
