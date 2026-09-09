$BaseUrl = "http://localhost:3000"

Write-Host "1. Health Check Testi" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get | ConvertTo-Json

Write-Host "`n2. Kullanıcı Kayıt (Register)" -ForegroundColor Cyan
$registerBody = @{
    email = "test-$(Get-Random)@example.com"
    password = "supersecurepassword123"
} | ConvertTo-Json

$user = Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
$user | ConvertTo-Json

Write-Host "`n3. Kullanıcı Giriş (Login)" -ForegroundColor Cyan
$loginToken = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $registerBody -ContentType "application/json"
$loginToken | ConvertTo-Json
$token = $loginToken.accessToken

Write-Host "`n4. Abonelik Oluşturma (Subscription)" -ForegroundColor Cyan
# Veritabanındaki varsayılan bir plan IDsini buraya ekliyoruz. Eğer farklıysa manuel güncellemek gerekebilir.
# Seed script'i "plan-1" ve "plan-2" ID'lerini kullanıyor olabilir. Eğer SQL'de UUID varsa aşağıyı güncellemeliyiz.
# Önce DB'den plan ID çekmek zorsa, şimdilik rastgele bir ID'yi hata verdirtmek veya seed edilen statik ID'yi kullanmak için bırakalım.
# Eğer seed.sql içinde UUID kullanılıyorsa, terminalden birini girmesini isteyelim:
$planId = Read-Host "Abonelik için kullanılacak Plan ID'yi girin (örn: veritabanındaki uuid)"

$subBody = @{ planId = $planId } | ConvertTo-Json
$headers = @{ Authorization = "Bearer $token" }

$sub = Invoke-RestMethod -Uri "$BaseUrl/subscriptions" -Method Post -Body $subBody -ContentType "application/json" -Headers $headers
$sub | ConvertTo-Json

Write-Host "`n5. Abonelik Bilgisini Getirme" -ForegroundColor Cyan
$subId = $sub.subscription.id
$getSub = Invoke-RestMethod -Uri "$BaseUrl/subscriptions/$subId" -Method Get -Headers $headers
$getSub | ConvertTo-Json

Write-Host "`n✅ Bütün testler tamamlandı!" -ForegroundColor Green
