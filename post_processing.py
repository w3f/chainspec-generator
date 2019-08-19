import json

with open('kusama.json', encoding='utf-8') as f:
    chain_spec = json.loads(f.read())
    bal_array = chain_spec['genesis']['runtime']['balances']['balances']
    for i in range(len(bal_array)):
        bal_item = chain_spec['genesis']['runtime']['balances']['balances'][i]
        bal_w_decimals = bal_item[1] * 1000
        chain_spec['genesis']['runtime']['balances']['balances'][i] =[bal_item[0], bal_w_decimals]

    claimers_array = chain_spec['genesis']['runtime']['claims']['claims']
    for i in range(len(claimers_array)):
        claims_item = chain_spec['genesis']['runtime']['claims']['claims'][i]
        claims_w_decimals = claims_item[1] * 1000
        chain_spec['genesis']['runtime']['claims']['claims'][i] = [claims_item[0], claims_w_decimals]

    vesting_array = chain_spec['genesis']['runtime']['balances']['vesting']
    for i in range(len(vesting_array)):
        vesting_item = chain_spec['genesis']['runtime']['balances']['vesting'][i]
        vesting_w_decimals = vesting_item[3] * 1000
        chain_spec['genesis']['runtime']['balances']['vesting'][i] = [ vesting_item[0], vesting_item[1], vesting_item[2], vesting_w_decimals]

    with open ('kusama_2.json', 'w', encoding='utf-8') as f2:
        json.dump(chain_spec, f2, ensure_ascii=False, indent=2)
