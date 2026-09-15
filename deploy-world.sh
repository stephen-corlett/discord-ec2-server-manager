#!/usr/bin/env bash
set -e

GAME=$1
WORLD=$2

if [ -z "$GAME" ] || [ -z "$WORLD" ]; then
  echo "Usage: $0 <game> <world>"
  echo "Example: $0 valheim capitalism-in-the-ashlands"
  exit 1
fi

SCRIPT_DIR="$(dirname "$0")"
GAME_DIR="${SCRIPT_DIR}/games/${GAME}"
GAME_CONFIG="${GAME_DIR}/game.json"
WORLD_CONFIG="${GAME_DIR}/worlds/${WORLD}.json"
BASE_DIR="${GAME_DIR}/base"
BASE_SCHEMA="${SCRIPT_DIR}/games/base-world-schema.json"
GAME_SCHEMA="${GAME_DIR}/world-schema.json"
ENV_FILE="${SCRIPT_DIR}/.env"

if [ ! -f "$GAME_CONFIG" ]; then
  echo "Error: Game config not found at ${GAME_CONFIG}"
  echo "Available games:"
  ls "${SCRIPT_DIR}/games/"*/game.json 2>/dev/null | while read -r f; do basename "$(dirname "$f")"; done
  exit 1
fi

if [ ! -f "$WORLD_CONFIG" ]; then
  echo "Error: World config not found at ${WORLD_CONFIG}"
  echo "Available worlds for ${GAME}:"
  ls "${GAME_DIR}/worlds/"*.json 2>/dev/null | while read -r f; do basename "$f" .json; done
  exit 1
fi

if [ ! -d "$BASE_DIR" ]; then
  echo "Error: Base server files not found at ${BASE_DIR}"
  exit 1
fi

if [ -f "$ENV_FILE" ]; then
  set -a; source <(tr -d '\r' < "$ENV_FILE"); set +a
fi

export AWS_PAGER=""

if [ -z "$CF_API_TOKEN" ] || [ -z "$CF_ZONE_ID" ] || [ -z "$CF_DOMAIN" ]; then
  echo "Warning: CF_API_TOKEN, CF_ZONE_ID, or CF_DOMAIN not set — skipping DNS setup"
fi

echo "Validating world config..."
WORLD_ENV=$(node -e "
  const base = require('${BASE_SCHEMA}');
  const game = require('${GAME_SCHEMA}');
  const world = require('${WORLD_CONFIG}');

  const props = {};
  for (const [k, v] of Object.entries(base.properties || {})) props[k] = { ...v };
  for (const [k, v] of Object.entries(game.properties || {})) props[k] = { ...props[k], ...v };

  const errors = [];
  const lines = [];

  for (const [key, def] of Object.entries(props)) {
    let val = world[key];
    if (val === undefined && def.fromEnv) val = process.env[def.fromEnv];
    if (val === undefined) {
      if (def.required) { errors.push('Missing required field: ' + key + (def.fromEnv ? ' (or set ' + def.fromEnv + ' in .env)' : '')); continue; }
      if (def.default !== undefined) val = def.default; else continue;
    }
    if (def.type === 'string' && typeof val !== 'string') { errors.push(key + ' must be a string'); continue; }
    if (def.type === 'number' && typeof val !== 'number') { errors.push(key + ' must be a number'); continue; }
    if (def.type === 'boolean' && typeof val !== 'boolean') { errors.push(key + ' must be a boolean'); continue; }
    if (def.maxLength && typeof val === 'string' && val.length > def.maxLength) { errors.push(key + ' must be at most ' + def.maxLength + ' characters'); continue; }
    if (def.pattern && typeof val === 'string' && !new RegExp(def.pattern).test(val)) { errors.push(key + ' must match pattern ' + def.pattern); continue; }
    if (!def.envVar) continue;
    let envVal;
    if (def.type === 'boolean') envVal = val ? (def.trueValue || 'true') : (def.falseValue || 'false');
    else envVal = String(val);
    lines.push(def.envVar + '=' + envVal);
  }

  for (const key of Object.keys(world)) {
    if (!props[key]) errors.push('Unknown field: ' + key);
  }

  if (errors.length) { console.error('Validation failed:\\n  ' + errors.join('\\n  ')); process.exit(1); }
  console.log(lines.join('\\n'));
")

INSTANCE_TYPE=$(node -e "console.log(require('${GAME_CONFIG}').instanceType)")
STORAGE_GB=$(node -e "console.log(require('${GAME_CONFIG}').storageGB)")
IMAGE_ID=$(node -e "console.log(require('${GAME_CONFIG}').imageId)")
START_SCRIPT=$(node -e "console.log(require('${GAME_CONFIG}').startScript)")
SAVE_PATH=$(node -e "console.log(require('${GAME_CONFIG}').savePath)")

PORT_OVERRIDES=$(node -e "
  const ports = require('${GAME_CONFIG}').ports || [];
  const overrides = [];
  ports.forEach((p, i) => {
    const n = i + 1;
    overrides.push('Port' + n + 'From=' + p.from);
    overrides.push('Port' + n + 'To=' + p.to);
    overrides.push('Port' + n + 'Protocol=' + p.protocol);
  });
  console.log(overrides.join(' '));
")

WORLD_ID=$(node -e "console.log(require('${WORLD_CONFIG}').worldId)")
SERVER_NAME=$(node -e "console.log(require('${WORLD_CONFIG}').serverName)")
STACK_NAME="game-server-${WORLD_ID}"
BUCKET_NAME="${STACK_NAME}-server-files"
SUBDOMAIN="${WORLD_ID}"
SERVER_URL="${SUBDOMAIN}.${CF_DOMAIN}"
DEPLOY_REGION="${AWS_REGION:-us-west-2}"

# Create S3 bucket if it doesn't exist (lives outside the stack so saves survive teardown)
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
  echo "S3 bucket ${BUCKET_NAME} already exists (reusing)"
else
  echo "Creating S3 bucket ${BUCKET_NAME}..."
  aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$DEPLOY_REGION" \
    --create-bucket-configuration LocationConstraint="$DEPLOY_REGION"
  aws s3api put-bucket-versioning --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled
  aws s3api put-public-access-block --bucket "$BUCKET_NAME" \
    --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET_NAME" \
    --lifecycle-configuration '{
      "Rules": [
        {"ID":"RetainSaveVersions","Status":"Enabled","Filter":{"Prefix":"saves/"},"NoncurrentVersionExpiration":{"NoncurrentDays":14}},
        {"ID":"ExpireNonSaveVersions","Status":"Enabled","Filter":{"Prefix":"server-files/"},"NoncurrentVersionExpiration":{"NoncurrentDays":1}}
      ]
    }'
fi

echo "Deploying ${STACK_NAME}..."
echo "  Game: ${GAME}"
echo "  World: ${WORLD}"
echo "  World ID: ${WORLD_ID}"
echo "  Instance: ${INSTANCE_TYPE}"
echo "  Storage: ${STORAGE_GB}GB"
echo "  Server URL: ${SERVER_URL}"

sam deploy \
  --template-file "${SCRIPT_DIR}/infrastructure/template.yaml" \
  --stack-name "${STACK_NAME}" \
  --region "${DEPLOY_REGION}" \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    GameName="${GAME}" \
    WorldId="${WORLD_ID}" \
    "ServerName=${SERVER_NAME}" \
    AwsRegion="${DEPLOY_REGION}" \
    ServerFilesBucket="${BUCKET_NAME}" \
    InstanceType="${INSTANCE_TYPE}" \
    StorageGB="${STORAGE_GB}" \
    ImageId="${IMAGE_ID}" \
    StartScript="${START_SCRIPT}" \
    SavePath="${SAVE_PATH}" \
    ServerUrl="${SERVER_URL}" \
    CfApiToken="${CF_API_TOKEN}" \
    CfDomain="${SUBDOMAIN}.${CF_DOMAIN}" \
    ${PORT_OVERRIDES}

echo ""
echo "Uploading server files to S3..."
aws s3 sync "${BASE_DIR}/" "s3://${STACK_NAME}-server-files/server-files/" --exclude "*.example"

echo "Uploading world config..."
echo "$WORLD_ENV" | aws s3 cp - "s3://${STACK_NAME}-server-files/server-files/.env"

if [ -n "$CF_API_TOKEN" ] && [ -n "$CF_ZONE_ID" ] && [ -n "$CF_DOMAIN" ]; then
  echo ""
  echo "Setting up DNS record: ${SERVER_URL}"

  EXISTING=$(curl -s -X GET \
    "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?type=A&name=${SERVER_URL}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json")

  RECORD_ID=$(echo "$EXISTING" | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const r = d.result && d.result[0];
    if (r) console.log(r.id);
  " 2>/dev/null || true)

  if [ -n "$RECORD_ID" ]; then
    echo "  DNS record already exists (${RECORD_ID}), will be updated by DDNS on boot"
  else
    curl -s -X POST \
      "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{\"type\":\"A\",\"name\":\"${SUBDOMAIN}\",\"content\":\"127.0.0.1\",\"ttl\":60,\"proxied\":false}" \
      > /dev/null
    echo "  Created DNS record — DDNS will update IP when server boots"
  fi
fi

echo ""
echo "Done! World '${WORLD_ID}' (${GAME}/${WORLD}) is deploying."
echo "  Server URL: ${SERVER_URL}"
echo "  Discord command: /viking start ${WORLD_ID}"
echo "  The EC2 instance will pull server files from S3 and start automatically."
