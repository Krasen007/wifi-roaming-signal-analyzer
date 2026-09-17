// Real-world style sample: a multi-SSID device (three SSIDs on one radio) plus a
// second AP, with the modern "AP BSSID" interfaces block attached.
export const SAMPLE_NETSH = `Interface name : Wi-Fi
There are 5 networks currently visible.

SSID 1 : LZ2COM
    Network type            : Infrastructure
    Authentication          : WPA2-Personal
    Encryption              : CCMP
    BSSID 1                 : f6:1e:57:ab:81:1d
         Signal             : 75%
         Radio type         : 802.11n
         Band               : 2.4 GHz
         Channel            : 6

SSID 2 : Areon
    Network type            : Infrastructure
    Authentication          : WPA2-Personal
    Encryption              : CCMP
    BSSID 1                 : f6:1e:57:ab:81:1c
         Signal             : 70%
         Radio type         : 802.11n
         Band               : 2.4 GHz
         Channel            : 6

SSID 3 : Areon - Work
    Network type            : Infrastructure
    Authentication          : WPA3-Personal
    Encryption              : CCMP
    BSSID 1                 : 22:61:b4:14:ad:b5
         Signal             : 78%
         Radio type         : 802.11ax
         Band               : 5 GHz
         Channel            : 48

SSID 4 : HW IoT 2.4GHz
    Network type            : Infrastructure
    Authentication          : WPA2-Personal
    Encryption              : CCMP
    BSSID 1                 : f6:1e:57:ab:81:1a
         Signal             : 72%
         Radio type         : 802.11n
         Band               : 2.4 GHz
         Channel            : 6

SSID 5 : HW 2.4GHz
    Network type            : Infrastructure
    Authentication          : WPA2-Personal
    Encryption              : CCMP
    BSSID 1                 : f4:1e:57:ab:81:1a
         Signal             : 72%
         Radio type         : 802.11n
         Band               : 2.4 GHz
         Channel            : 6

There is 1 interface on the system:

    Name                   : Wi-Fi
    Description            : Intel(R) Wi-Fi 6E AX211 160MHz
    GUID                   : 422b4c07-1fec-438b-9efa-cc8d098768b9
    Physical address       : 84:d1:c1:c1:4c:6a
    Interface type         : Primary
    State                  : connected
    SSID                   : Areon - Work
    AP BSSID               : 22:61:b4:14:ad:b5
    Band                   : 5 GHz
    Channel                : 48
    Network type           : Infrastructure
    Radio type             : 802.11ax
    Authentication         : WPA3-Personal  (H2E)
    Cipher                 : CCMP
    Connection mode        : Profile
    Receive rate (Mbps)    : 216
    Transmit rate (Mbps)   : 324
    Signal                 : 78%
    Rssi                   : -67
    Profile                : Areon - Work
`;
