export function isSafaricomRequest(req) {
    const safaricomIps = [
        '196.201.214.200',
        '196.201.214.206',
        '196.201.214.207',
        '196.201.214.208',
        '196.201.214.209',
    ];

    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    return safaricomIps.some(safeIp => ip.includes(safeIp));
}
