<?php
ob_start();
$json = json_decode(urldecode(filter_input(INPUT_GET, "state")), true);

switch ($json["app"]) {
    case "localizoom":
        $token_params = http_build_query(array(
            "grant_type" => "authorization_code",
            "code" => filter_input(INPUT_GET, "code"),
            "redirect_uri" => getenv("ebrains_redirect_lz"),
            "client_id" => getenv("ebrains_id_lz"),
            "client_secret" => getenv("ebrains_secret_lz")
        ));
        break;
    case "webwarp":
        $token_params = http_build_query(array(
            "grant_type" => "authorization_code",
            "code" => filter_input(INPUT_GET, "code"),
            "redirect_uri" => getenv("ebrains_redirect_ww"),
            "client_id" => getenv("ebrains_id_ww"),
            "client_secret" => getenv("ebrains_secret_ww")
        ));
        break;
}
$token_ch = curl_init(getenv("ebrains_token"));
curl_setopt_array($token_ch, array(
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $token_params
));
$token_res = curl_exec($token_ch);
curl_close($token_ch);
$token_obj = json_decode($token_res, true);
$token = $token_obj["access_token"];

$json["token"] = $token;
?>
<!DOCTYPE html>
<html>
    <head>
        <title>TODO supply a title</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="dppick.js"></script>
        <script>
            let state=<?php echo json_encode($json);?>;
            async function startup(){
                const choice=await dppick({
                    bucket:state["clb-collab-id"],
                    token:state.token,
                    title:`Select a ${{localizoom:"LocaliZoom",webwarp:"WebWarp"}[state.app]} descriptor`,
                    extensions:{webwarp:[".waln","wwrp"],localizoom:[".waln","wwrp","lz"]}[state.app],
                    nocancel:true
                });
                state.filename=choice.pick;
                location.href="filmstripzoom.html?"+encodeURIComponent(JSON.stringify(state));
            }
        </script>
    </head>
    <body onload="startup()">
    </body>
</html>
