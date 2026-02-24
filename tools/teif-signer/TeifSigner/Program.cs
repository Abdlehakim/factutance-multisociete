using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using System.Security.Cryptography;
using System.Xml;

// If you get compile errors here, ensure:
// dotnet add package System.Security.Cryptography.Xml
using System.Security.Cryptography.Xml;

static int ExitInvalidArgs(bool json)
{
    if (json) Console.WriteLine(JsonSerializer.Serialize(new { ok = false, error = "INVALID_ARGS" }));
    else
    {
        Console.WriteLine("Usage:");
        Console.WriteLine("  teif-signer list --json");
        Console.WriteLine("  teif-signer sign --in <path> --out <path> --thumbprint <thumbprint> --json");
    }
    return 2;
}

static string? GetArg(Dictionary<string, string?> map, string key)
    => map.TryGetValue(key, out var v) ? v : null;

static Dictionary<string, string?> ParseArgs(string[] args)
{
    var map = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
    for (int i = 0; i < args.Length; i++)
    {
        var a = args[i];
        if (!a.StartsWith("--")) continue;

        var key = a.Substring(2);
        string? val = null;

        // flags like --json
        if (i + 1 < args.Length && !args[i + 1].StartsWith("--"))
        {
            val = args[i + 1];
            i++;
        }
        map[key] = val;
    }
    return map;
}

static X509Certificate2 FindByThumbprint(string thumbprint)
{
    var normalized = thumbprint.Replace(" ", "").ToUpperInvariant();

    using var store = new X509Store(StoreName.My, StoreLocation.CurrentUser);
    store.Open(OpenFlags.ReadOnly);

    var found = store.Certificates
        .Find(X509FindType.FindByThumbprint, normalized, validOnly: false)
        .OfType<X509Certificate2>()
        .FirstOrDefault();

    if (found == null) throw new Exception("CERT_NOT_FOUND");
    if (!found.HasPrivateKey) throw new Exception("CERT_NO_PRIVATE_KEY");

    return found;
}

static int ListCerts(bool json)
{
    using var store = new X509Store(StoreName.My, StoreLocation.CurrentUser);
    store.Open(OpenFlags.ReadOnly);

    var certs = store.Certificates
        .Cast<X509Certificate2>()
        .Select(c => new
        {
            subject = c.Subject,
            issuer = c.Issuer,
            thumbprint = c.Thumbprint,
            notBefore = c.NotBefore,
            notAfter = c.NotAfter,
            hasPrivateKey = c.HasPrivateKey
        })
        .ToList();

    Console.WriteLine(JsonSerializer.Serialize(new { ok = true, certs }));
    return 0;
}

static int SignXml(string inPath, string outPath, string thumbprint, bool json)
{
    if (!File.Exists(inPath)) throw new FileNotFoundException("INPUT_NOT_FOUND", inPath);

    var cert = FindByThumbprint(thumbprint);

    var xml = new XmlDocument { PreserveWhitespace = true };
    xml.Load(inPath);

    // Phase 1: sign the whole document (Reference URI = "")
    var signedXml = new SignedXml(xml);

    var rsa = cert.GetRSAPrivateKey();
    if (rsa == null) throw new Exception("NO_RSA_PRIVATE_KEY");
    signedXml.SigningKey = rsa;

  var si = signedXml.SignedInfo ?? throw new InvalidOperationException("SignedInfo is null");
si.CanonicalizationMethod = SignedXml.XmlDsigExcC14NTransformUrl;
si.SignatureMethod = SignedXml.XmlDsigRSASHA256Url;
    signedXml.SignedInfo.SignatureMethod = SignedXml.XmlDsigRSASHA256Url;

    var reference = new Reference { Uri = "" };
    reference.DigestMethod = SignedXml.XmlDsigSHA256Url;

    reference.AddTransform(new XmlDsigEnvelopedSignatureTransform());
    reference.AddTransform(new XmlDsigExcC14NTransform());

    signedXml.AddReference(reference);

    var keyInfo = new KeyInfo();
    keyInfo.AddClause(new KeyInfoX509Data(cert));
    signedXml.KeyInfo = keyInfo;

    // This is where Windows/token middleware may prompt for PIN automatically.
    signedXml.ComputeSignature();

    var signatureElem = signedXml.GetXml();
    xml.DocumentElement!.AppendChild(xml.ImportNode(signatureElem, true));

    Directory.CreateDirectory(Path.GetDirectoryName(outPath)!);
    xml.Save(outPath);

    Console.WriteLine(JsonSerializer.Serialize(new { ok = true, signedPath = outPath, thumbprint = cert.Thumbprint }));
    return 0;
}

try
{
    var cmd = args.Length > 0 ? args[0].ToLowerInvariant() : "";
    var parsed = ParseArgs(args);
    var json = parsed.ContainsKey("json");

    if (cmd == "list")
        return ListCerts(json);

    if (cmd == "sign")
    {
        var inPath = GetArg(parsed, "in");
        var outPath = GetArg(parsed, "out");
        var thumb = GetArg(parsed, "thumbprint");

        if (string.IsNullOrWhiteSpace(inPath) || string.IsNullOrWhiteSpace(outPath) || string.IsNullOrWhiteSpace(thumb))
            return ExitInvalidArgs(json);

        return SignXml(inPath, outPath, thumb, json);
    }

    return ExitInvalidArgs(parsed.ContainsKey("json"));
}
catch (Exception ex)
{
    // Map exit codes
    var msg = ex.Message ?? "SIGN_FAILED";
    var code = msg switch
    {
        "CERT_NOT_FOUND" => 5,
        "CERT_NO_PRIVATE_KEY" => 5,
        "NO_RSA_PRIVATE_KEY" => 5,
        _ => 10
    };

    var isJson = args.Any(a => a.Equals("--json", StringComparison.OrdinalIgnoreCase));
    if (isJson) Console.WriteLine(JsonSerializer.Serialize(new { ok = false, error = msg }));
    else Console.Error.WriteLine(ex);

    return code;
}
