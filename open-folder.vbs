' open-folder.vbs
' Reçoit une URI du type ouvrir:///D:/Cours/Kesh%20Jig et ouvre ce chemin dans l'Explorateur Windows.
' Installé automatiquement par install-protocol.bat — ne pas lancer directement.

Dim uri, path, prefix, prefix2, decoded, i, ch

If WScript.Arguments.Count = 0 Then
    WScript.Quit
End If

uri = WScript.Arguments(0)

prefix = "ouvrir:///"
prefix2 = "ouvrir://"

If InStr(1, uri, prefix, vbTextCompare) = 1 Then
    path = Mid(uri, Len(prefix) + 1)
ElseIf InStr(1, uri, prefix2, vbTextCompare) = 1 Then
    path = Mid(uri, Len(prefix2) + 1)
Else
    path = uri
End If

' Décoder les caractères encodés (%20 -> espace, etc.)
decoded = ""
i = 1
Do While i <= Len(path)
    ch = Mid(path, i, 1)
    If ch = "%" And i + 2 <= Len(path) Then
        decoded = decoded & Chr(CLng("&H" & Mid(path, i + 1, 2)))
        i = i + 3
    Else
        decoded = decoded & ch
        i = i + 1
    End If
Loop

' Remettre des antislash Windows
decoded = Replace(decoded, "/", "\")

Dim shell
Set shell = CreateObject("WScript.Shell")
shell.Run "explorer.exe """ & decoded & """", 1, False
