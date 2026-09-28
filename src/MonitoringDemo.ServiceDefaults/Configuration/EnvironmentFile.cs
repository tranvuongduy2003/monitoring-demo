namespace MonitoringDemo.ServiceDefaults;

public static class EnvironmentFile
{
    public static void LoadForProject(string projectName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(projectName);

        string? path = CandidatePaths(projectName).FirstOrDefault(File.Exists);
        if (path is null)
        {
            return;
        }

        foreach (string rawLine in File.ReadLines(path))
        {
            if (TryParse(rawLine, out string key, out string value) &&
                Environment.GetEnvironmentVariable(key) is null)
            {
                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }

    private static IEnumerable<string> CandidatePaths(string projectName)
    {
        string currentDirectory = Directory.GetCurrentDirectory();
        string baseDirectory = AppContext.BaseDirectory;

        yield return Path.Combine(currentDirectory, "src", projectName, ".env");
        yield return Path.Combine(currentDirectory, ".env");
        yield return Path.GetFullPath(Path.Combine(baseDirectory, "..", "..", "..", ".env"));
    }

    private static bool TryParse(string rawLine, out string key, out string value)
    {
        string line = rawLine.Trim();
        if (line.Length == 0 || line.StartsWith('#'))
        {
            key = string.Empty;
            value = string.Empty;
            return false;
        }

        if (line.StartsWith("export ", StringComparison.Ordinal))
        {
            line = line[7..].TrimStart();
        }

        int separator = line.IndexOf('=');
        if (separator <= 0)
        {
            key = string.Empty;
            value = string.Empty;
            return false;
        }

        key = line[..separator].Trim();
        value = Unquote(line[(separator + 1)..].Trim());
        return key.Length > 0;
    }

    private static string Unquote(string value) =>
        value.Length >= 2 &&
        ((value[0] == '"' && value[^1] == '"') ||
         (value[0] == '\'' && value[^1] == '\''))
            ? value[1..^1]
            : value;
}
