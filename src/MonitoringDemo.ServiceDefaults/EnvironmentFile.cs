namespace MonitoringDemo.ServiceDefaults;

public static class EnvironmentFile
{
    public static void LoadForProject(string projectName)
    {
        string currentDirectory = Directory.GetCurrentDirectory();
        string baseDirectory = AppContext.BaseDirectory;

        string[] candidates =
        [
            Path.Combine(currentDirectory, "src", projectName, ".env"),
            Path.Combine(currentDirectory, ".env"),
            Path.GetFullPath(Path.Combine(baseDirectory, "..", "..", "..", ".env"))
        ];

        string? path = candidates.FirstOrDefault(File.Exists);
        if (path is null)
        {
            return;
        }

        foreach (string rawLine in File.ReadLines(path))
        {
            string line = rawLine.Trim();
            if (line.Length == 0 || line.StartsWith('#'))
            {
                continue;
            }

            if (line.StartsWith("export ", StringComparison.Ordinal))
            {
                line = line[7..].TrimStart();
            }

            int separator = line.IndexOf('=');
            if (separator <= 0)
            {
                continue;
            }

            string key = line[..separator].Trim();
            string value = line[(separator + 1)..].Trim();

            if (value.Length >= 2 &&
                ((value[0] == '"' && value[^1] == '"') ||
                 (value[0] == '\'' && value[^1] == '\'')))
            {
                value = value[1..^1];
            }

            if (Environment.GetEnvironmentVariable(key) is null)
            {
                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }
}
