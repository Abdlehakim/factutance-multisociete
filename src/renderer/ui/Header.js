import { html } from "./utils.js";

export function renderHeader() {
  return html(`
    <header id="invoice" class="header actions actions--sticky">
      <div class="actions__brand">
        <div class="brand brand--sticky">
          <div class="logo-wrap">
            <img id="companyLogo" class="company-logo" alt="Logo Facturance v1.2.6" data-logo-state="set" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIwAAABuCAYAAAD1TPu3AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAABk/SURBVHgB7V1dbNxWdj6XIzmyu2gmjV34oYBpoC3SOIXHb9v2wXQXRSznwXLi37x49NS+WW5RbNugq1GBoliggCSgKHbRAhq9+C/2agy0lhy3CVV0t8kWqEdAEnvrbEU37SK7cdbj2JFka8i755CX0mjmXvJyhiONfj6AGg15+TPkx/N3zz0XYAtb2MIW2gUGW2gaVt9Etrt70WSMm4bBsgCZPZ7HZ965crwEGxRdsAUtHD49YRrgDXLgJn5FkrAs5y6SxKhpxcHIQF73mEdOX8vj8cbwX5sDswG86YWFrrJdOlaBDsUWYTRhQBUfLsuH3znn0nYMDAc0cOTNiRz33DHx1WLALdp7e48Lvaev2sBZ2eXV6WfPttmdRCADtqAFlB1nISUQWYB770U0sYDxgYyRmUACPbT6xrLQIdi0hCH74/Dpty2dtodRdUCgimLB2HNO9LEmTO55EyihtEiAUq1gl/o7RsJsOpVEJGHABgFcC8U+PYgX4vZBz2AQNHHjwmv3QXnuCZMBSRY98iEcgGfj0EHYFF4SSZPtO+AseG4ffa3d5hlG380Lr19X7dt75mofvuYToAkOXv/yN+bQXzJke3ogm5As4HEYuHn5+Ch0EDY0YXzD0vXOMgPyESrAnrx0/JBsg+8ZMRfVB+Rg9eHgde2FDsOGJYxQPe/ptEXX9tDUpRO2v4/RtZ8kEbrNOV07ox3gDPJTF49rq6PeM9cG8Iec44wVpi6+3jY1toEJcyWPLu6YVmMOZWYwcy0JUgdt6bJsky2rWnTRh25cOlGANmCLMApglMVhDCpkh6BKqnDuVRgz6r0VDOBBVhANDVowISUgCYoeGENTl445su1kl+3o8YZROuZB/gNK808f96ftYW16whAp0Lgs40MnKVM2WGZmbq7iLN3o7Eum/9ltZDF2EkggIs6ih9t7KlApr3ggZDd53iLaPMZBPDbGW1qzf+qJExClOoDXcC5eIiLZwTikIl1z17NBEUkYBmXs87ENI1Oan380Y9vfzkKG5TCuvwc8L4cswgWQINoSo4xLxf/k3jR0P1eGz8pOcB0X8RgZCwl0ltV5aElAxKl61esZo2s4iaeFv6Hicrf/nSunUunf2rCE6X1z4hwaryPhd1QxNv5cJElP8caNtx5B97M+8OAgGMyqIUYFSA1xin/QTjz4ZMxcOjDDtjpEYv4xbCTgdfjijv+wAvJ0DwrixB8jReALcv7mlRMj0CLWFWH8wBd3h6ueN3Tr7ZNlWRtfZG93C2h3nCN143q8SJJkcvIv7kNXVx5ZcBCbkZrA/b0yinb85DOwOOdAxdHX97teziHh9gCpHUDSRUmPkDzAR+Hzj8sU6u/p+aU+lIBkrJrQbqC6nX/65FAa9sy6IQx5AwYzlkLq9Z5ArW73w2ecjdx1bo07P/73o3jD+oJW3EaS2PDg7jS0Azt/+yBwNw9+XxAzFa2wY9EbJakTSJxtqKp4AdoElKzFhYXH59MyftcFYY6cfrvAA9dxBUivzy18eb6n52u5wF7hFL8oTP3Lt2bwn7O+rmeGDYtPxhNJjzTw4st5JA2SV2n02tDV3U+2DhGHQTfFjExIER7nIzcvnzgPKaKjCROoF2+ML0mIRmCArRJKlO+///czj5/8FIniOriu1DZJkgSB1CkqJQ6DImS6hwLiXBtMS9pQp+XUpTeGIGV0LGGCfBFvIs4joLfoBx98ZzogCtok1bnRVZcmOiCJQ52YMuL4Ng4/RvYN9V2h5BxrJYjYzj6ojiQMpRMYDIYjbxoacpUv/2/oP/7zH9GI5ZWOJUotKKaTMYg0eXkDPgQPPi40q6L8mBIYA+3sGujI9AbDYA9RuijJ4ovbd791H1vugepXQx1PlBCVuw7+7Ydf2TcDBgw3NkA7befLMHXpDJHmUFLScD9dg7VVDXesSuo9fXUWGm+W88mPp4fuzf4rEsUbFw9gfYLccu53jkpejEDShJl5CdWTsvc9DXRsxh2asUMrv0Px397/u8K92VuzeDOH1jVZCGivAOP0YCXS0Zc0hRsXjpU97h2DZLDIeE60AzoXum072ks6cubaQ3q7fv7w05EP/usfKLhWWjfqRxeRksY7Dw/ujDTjPVVd74AquPkHJ67kurq7DzLsBuF+8rnfO64llTqaML0n3x5wfvJDfufOP90Pw+sbErvQg+JM0VHqHsLwgI0qmkhlgT581UTSo6enmkNVYqHtd1CV5zO/8PgFneBe5wfuyLNY7+pHBzv3kRE80LCeXO7F7gOHD38za7BttxPZM+hJ+h2pOk014zadP2pgM5CF8OAjisg2qhDq6OxeHETPycH4SrLOQ02y+E05H9BptzUuqaPA5GF8DMTB7pzZ02OMBpHtdpwatIbdbBGmk/DgQ+yY5EXpturiWKl4rJJYyiQA9vAfjWuTpg1DunVjeTASBEYk/daqKe+2YI7r8orKQ4kF2WxdmVnpNsYP9L32186zp95sW/KPOVTmnz7eG2X8tkIYE5c8LsTKWl3pgJ/7AUPi/2YxII5t1hy3iEvSsLeJC/UaW7DsujpJjuWnVoBxVrigps4+pDoo7ZMzo5g4VP/iy2OK7oMRsnV6z1wbBk2bIyni+qFaIQy5gfmI7cTSvdCc1CniohrLbOOSJJIZdZ0FCIitRO/JawNg8GFoCcxJNPxj5ysWvu6yITLYZ9a99/Dht3K6Q2iSAglTQsIog4Wt2DBWzHZ6m89Bc9gP0eeN1bV17VXogzgYPMm5FOAm416R8nq0mpMtw6TSOQtdCzkaQ9UG49dBNgw8ffq4P6pRs4TJg55otqA5mDHbdcVxPuZYUdtSByWBvYrBSM3GikBlxiewp9ye9JpQYjPDonFQkxeOj8YF75oljO5bZ0FzpIkz6CzQO25ciY4sxJ+rETROiUGeGZkDzNhuLi+ZA/7YasaUD9NgTLOfh8nHey8lk7kt9UpT3xwRZQqjwZMXX9c+VjPpDSbIRTm9OQVofACUdG2DPnQf4NGY45qgRypql8yjYVBRDGO9L45VpG4NZMewZN8s9eXEelHVrjJ0LUrOzUzI5vAeddtIGkh02f4YLDaysPDlaLM5vs1IGEuxnt6IomR9UmteRZj6H5iHaHLp9tjugTZg8sqJES6/H5DpMvbH7S8GyMlJ5dsxyQenzc0/3kvh/1YSwpshjOxB2BC4qjIxSg/VAn2YivUjkuNGqRyr7jvdfFvSLv14xhK81pKZmIIwPBOS3IEE2LHjV5+HFpGUMBRvMSXri+LTBrkbnYKn4ZOx/tgqLycPjddJhHMkbU1oE5jRLX1AnHG9N5wrQhJsKWDoQAJw/tSEFpGUMCo3ufZNkhl8edCHqVj/EBpFvAVy6SWTPNMJz9cyWDBGqXG9V50BrQMEBYkaIEZeclBsVwANchNaRFLCWJJ1NqxkuswYTKKWVGKTDEqZyjtY992UnItI7IAcbVFJR85cHZEVIiK7hnqeQQveI+gwJPGSLIhWRyFI75IorX8QcV5NiKgHaEPw4M2adWRU10ZrLcl+RWjufHJw6tm9kq9f7asg1zMjKl45NAoR1jGSEEZlYNaL+tC6t+rW53HRuVmyG12ry4sQuO+17S1YJmO9Ue7AsmRyoBEmJAWjenWSyhCe63e2SEv4MijNz6dfr2W1kYQwMgPTBvlDIBVg1a2rf7AqxBGGOsYKddsHxXFlRrkNyc+XNmzOM+fXmiwGsJHeUxgfom4FzrBjFOMyaE8ZBhVK6nJ0XHVdwuRBfmOLivZkx4xI1uuopbgHWBHHsGrWWaDuuxqq2zfp+dKAxcCdxb6kZKXEuCJGJPqZWJI6MeBXL88uZeExblHPc8bIiK1+BXL6x6ESbpOKDkhdo1flFqs8j/Ch1kPlBtdCqvvrvst6mEllWnXr7Lp9VUZk4uAdlTSTLUGZM9U+bPDI6atj2icBJiezrlveHEzO1C+RjoShnWUPuhyeQLGfDY0P0IR4taTzxtvi/LVeiEyiFUEPVNz5PugDxbe6aGFQtsw9xyThBCRVHjsgZzSL++Skaym5G/ycm5xqzoNWwLma9DoSRiUV6MfMRiwFxX4HIRq6KqIUs51+9LhknQwtR0BrQQPQkFD9VM5Vtp06IDXnD1BIGPdRX34i28aqn7Zqgw5h0ojS1iIfsz3O6A0xCtHJWSXN4xBMaAMob0WapoAin2raRO7sdzBKJUwFPr9XXlioRu/fAtAILiu3QTRM0LM7ksCEaJtBlzC0rghqFDWP01ZwxqQ3n3MW3QHZpSREoI6oAHWbQIUiVdviCGNBe5BXrE8qYlVzBDggN8hXVcJEgSboim7hKVQ3lV2j7gWvPRIG7Zco9z/O6FUF68hgK0M8TJDbMhbIPR3VTXQU622g8hnBdZpiHamApMV02mULQDBxViO44cXcP2bJ13u2v3+bXmbOop9rFGFMUF8UPRAH9JCHxjfYAvmwlGYeXBH0vSFHsb4thAnq/8sJ4y1ytVe2O2dCdVG2X4XKsFE1UYybmNAGcOGBqRClkizFejqgA/pQeTMy6dW2Nz0Gic9LWXOy9eHEXf7gea4cbeBEZty5zyzpes7FvfQsaBuie8CjJIzKO7IhGcjOGJCsJ2NaV3U4kB4caJR4SQljdmWM2yIyGh4TlicOZZE7U6XPmAYqU8AnDKq5uFzlphHlIRGiCGMp1o9DMtgg7722oFEtrZWEMVUbGGcVzmKDYyb90Qmi+VUSLr6hvocqdURVyb/4+LpQRxYkAF9+4Zxgsg0x0QbjjoGfFKijqQfn5n72KK6/K2kSuANJE6YDFEEuZUiK6RDQgfTgQAKvyGPeKAPWcmghqEoOhZuX34iWqu7ioGKLLa7IggSgYSRTKZYwi7JhRiTrbGgOMiO5oji+A+2FKu9YCn/QmOsdoBsf1U+kAg/mpC5QArZmKVRLutYNSrixBPNPQrBDEVIEi9ke1uUnOBDENpoNfpkQjGjMwXKOSiXivCYs59Yk6edJci1ElBlIIDX9QoXA93gez9Ucawkk7o0Mc2j+6rm5R9OJUhrUlahsePDRISpHy4KJ0fWgMbg+KeIIs4XVxK59s/KZUtBmQXc6admyIB30eD+kiGZHPm4hbex8paCYVscOYi9+sR8LEmFxCFLGFmE6AeQZMYWrXHV9CcGAJbJdkiWb62OLMJ0A8oxk0oWqUVXu0qQVeegA6ULQIUwel9sQGIi3xUKpkDT5d6hTQ0PMhOV6LLfF/+dEuwlY9kboOxmNRQhc66JYR20HRNtzNW0Has6fFcftE/sO1FxLVnyCaGOJfcJ1OfF9Qvwf7jtRc9zwnHnxeVuc66y4zgnRrva3hL89PNZZ0WZWfA6KdsNi2QMhqBYMl3bGVpr2jKhYgNfVcihABh3C0I+3IbjBYaVHcg9NkA/7oP/3wLInlBXtwjZZWM6/PVrTno47I853TJzDgsBTOli3n1n3ndqXYGXFKhOWPa1SzbnDT1o/KPZ1JPsWIfAKS6J9eJ0DNdcENfuE94lUSEF8OuLTFL/vOtS68JTzwhReD/MKJF2CmjLJcncp38Yw2HDv6Wuzr775vVTzmXTyYXJiqT8x3bTpurbZmu+1fU65mn1qo7vna/apb29C8BDCRKKQeLmVl+HvE15jpe584faZuusui2NXao7twPLvpfV9EJCiPrC4t+5cAMvENGv+B8l1OivWdC8OK1SRA5/fGaWoLk9ou9QdyDQ8r3Tk9LWxIELcOjIx200I3gp62+mmEkGe4nJXfH8JgsRqukFfx+VHuHwm2tG2Hgge1k0IYikOLgu4/BSXb4vv23H5QLRn4lx/iMtucbwhsb1HHGNcnG9GHOcyLt+EQBp9V7QlMoyINqZYwhjSS+K3fVcci871vvid98W+f15zD3LiOPfF5ykIpE5tAPDr4jrot7wKwYsQkmZG/K5p8XuZ/7t27vsj/PwzaASpot+BhQeV33jlZKiCW0UO4zcDv/nKCXbvw7dtaAEMNg5MCG5uGTodfn9RFckgyckle+aLj8ZV0xa2joT19ur3hi2sLogs7uJ7ipiLXyUzmI3OvQ1tBCWo+znHCbFFmNUEGbldi6GHWAdehgcfH/CnWgbvvcSGbgLwFiLAHTkj24ZFV5U8okaykJHrBvMiMe5OAJNKn7TgtBKj2QrcrRZ27SsiMxpjIwFZDvku9JmrI8CU0xanAn+a5hYiwO0nTDC+ZnODyMKlKamVJbKQkcubrmusBZqBV1HMURtxbnVLIH386MmnfzMH/BHMPXBgs4Felq+9OAnysV0Vfwq/n9+52z6PaAWcqcsneqFFtE3ChMbb/pePoojNtPtmdB7IGwoMXKthG6mhqnuA5n1cJbKggFs8BCmgLRKm1tLPZLbtnpt/WH7Mva/D3Oc3YTNgVy4HfJEky0sN22ptlubIQiXeC2geL0iPL0Ew29rJ65ACUieMmDp3stYt3L3rpYVP/sfOwo4X72941bRz3wAEWXG7Gzei6+x6va2QhSTF1MVTNz/58MrlX/v13tFt27a/zzlfYMt9ayvPGOT0ppZElWocxp8mhhkTsqoCj778SfEHH3zHgu5th+CzsgMbDWSvZKoFtEtUhusITcpuWcOwvaeK3RYs6VCRgCwRHk7vme8d9Dy3z2B+0rqps09SpEYY7ODK85h804/uTg787/+/PwCZ7o1FGkpRoF5nroifMG8g7EwUcZakrnPiBx/kHi/CjQtNTvSlQCqECWwWdza+JXPe/f7flp4ufNm3IUgTJ1XIXjHgGBm3UdI3BqlLiVaQipckiunZ8S25+fu/+8fWcz2/XPL7U2iS7/UKslW6qrORKsidCzwhDMjRhFiJyUIzunUQWQipudWojvTCzYzlvvF7f5LFkCMGs9ht2PlbA7CeQOpn5z6RPSfrbUap4mf5f3T+8OHhbO+pq7ebDch5mdaisu1AaoQRPZ92XDsaDEZ13nq/Ucj19LxQwEsYxkjomB+36GQsEYXLYyt+/gsvwBcf76Usf/KCDObdbiXUb3is416m1L0k1VyEwchBo8AYe4RudyCeUeR++KN/Hvr00x8O+/MAkZSqbhsRU7+sPchG6a6eFZNaWREtfQ8IKk4luAdU9Dmd3mbP4+c1CyiuClJPb5AMtnKAGfnaWb9WjuBjzj3nvf5P7r171p9Jlfl1Ykehq7u0ZkZxMEnnUby2vFTthKCsfkrU9jP7fcM/TDxPD20YvdgKUidMKGWWB5/LxxPXD/vE/4du3Pqr26j/RwJpA8G4YO6Oo4i3od0IScKw34dHpheQ6kGJMjcaSJQJ0wBvEG24PLQLjI1MXnyjI+YoaEsCFU3csLDwVSnurWgcK8wcmjNx6tagCZTRv0wcBwL7CBc+Q54HtAI/kamaw+PuR/VoobVgRUqSALY/l+Pik/FQ9Yi5rPOwCqi63oGmJ09PEWuacafKLkMJVfTAGJq69RYGxPyIqLVyT5qCl0pr8WAEANU6oaliuOesbGYEx6US7CQ1qMI1lU7nmglKvnpEtWNUS/Cz/54JrtmXoIPQvoKRKtiTKZbtaBZrSpjY/hQOJc746NTUXzqQMRTkSRWCgCRJ3BJU7tBIgYAk3DgaMa3NqoCjLdhs8nZaWDPC6EeHCVQ+A2wPvPGpqT8tQ2bHQZpcAVVJOB6pmYdI5HD8Mux+mS5vOlR1VKdu27ZnVoZ1HVxrktQibtb61cCaEYYGVzWn/1nwkDMZm3vVGT/+kzXR/d1hAs88D1RjzhA1cDmqutpp8LjhUNl1WJxzyA4JVweDvBZRimT2+xWewhk/UkAYTkDS7TUYDDdDvjgHYjWxJoRJfRgFEYixCtoWjkczihhGhXuLDTOX0Ixp3POyBs3Y4U8Fo5z0tCUED5gXGauO1kZqRepHsi6CDpuYa00IQ2N+2zmMYs1AfT/MKEVNJJ6ANA3xq07AqhMmcdktceM493A/5byTaw7OIK+bYH349EW037opwGnKtlOy9tOnT4Y6cbq/VR+XxFAloI2h21xkmPli3X/TKMbDWOaoCNevS5CaQtIckpDGfzluXuosqVKLVR+XNIn9ImIeISeqXdBJ2di1P3XpZBGjnsfmFx6/QBFQWKeg3yUSsx36TlIFf9OBTlNB9ViTgWzk2dDN4oo5AvzypsyLzAMhcR01c1hSiF50B1YRS6RhhnXz8ok1n0RUB2s2VFaQoR9VzLTBMivczarr9r9z5VRsGNzgkOMJrTCXG7muzHNLD6a++nXSSpUhuNdcWQ5xHxxYJ1jzsdWkYlCf2wbrnuA+AYz8O1eOl3T2xShwoodEMZF3Lr8+E9nIyJTAcy1IiPj5jzYGOmJsNb1lNy4eP8CMzIEkoW+WNMCmURX7uW2J51LYVOiowfg0uaZu2yYmyXR03N5S8RipJxu2IMW6rd7w7Ktk8Rjs5CxqNya1lBwmbAKsW8LwrqQzkj3TVjVJ1RJ5WMzga56rshpYvwWFmJ/jooWkVbFJLaG3ZIPEWyJyYK9xmaa6YwYrG2y7fePCa/dhk2DdEmbywvFRq29sfPv25/fjQ8y6rmuREYxB5Bx6WytsG+wtLkJCoAqzaYLPIDaD/5ME4UZ5bv7RzHqIl7QLa5pA1S7QrPNEJAz+5TyXmxQUg4Qgo/rZs23PbybpsYUtbGELa4tfAHOeI3ZYdF3YAAAAAElFTkSuQmCC">
          </div>
        </div>
      </div>
      <div class="actions__buttons">
        <details id="documentActionsMenu" class="field-toggle-menu actions-menu">
          <summary
            class="btn field-toggle-trigger actions-menu__trigger better-style "
            role="button"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="documentActionsPanel"
          >
            <span>Documents</span>
          </summary>
          <div
            id="documentActionsPanel"
            class="field-toggle-panel actions-menu__panel"
            role="menu"
            aria-label="Document"
          >
            <button id="btnNew" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Nouveau
            </button>
            <button id="btnOpen" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Ouvrir
            </button>
            <button id="btnAllPdf" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Ouvrir un Documents PDF
            </button>
            <button id="btnAllXml" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Ouvrir un Fichier XML
            </button>
            <button
              id="btnOpenDataDir"
              class="model-select-option actions-menu__item actions-menu__item--icon"
              type="button"
              title="Ouvrir le dossier Facturance Data"
              aria-label="Ouvrir le dossier Facturance Data"
              role="menuitem"
            >
              <span>Ouvrir l’emplacement du fichier</span>
            </button>
          </div>
        </details>
        <details id="addMenu" class="field-toggle-menu actions-menu">
          <summary
            class="btn field-toggle-trigger actions-menu__trigger better-style"
            role="button"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="addMenuPanel"
          >
            <span>Listes</span>
          </summary>
          <div
            id="addMenuPanel"
            class="field-toggle-panel actions-menu__panel"
            role="menu"
            aria-label="Ajouter"
          >
            <button id="btnAddClientMenu" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Clients
            </button>
            <button
              id="btnAddFournisseurMenu"
              class="model-select-option actions-menu__item"
              type="button"
              role="menuitem"
            >
              Fournisseurs
            </button>
            <button
              id="btnAddArticleMenu"
              class="model-select-option actions-menu__item"
              type="button"
              role="menuitem"
            >
              Articles
            </button>
          </div>
        </details>
        <details id="paymentsMenu" class="field-toggle-menu actions-menu">
          <summary
            class="btn field-toggle-trigger actions-menu__trigger better-style"
            role="button"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="paymentsPanel"
          >
            <span>Paiements</span>
          </summary>
          <div
            id="paymentsPanel"
            class="field-toggle-panel actions-menu__panel"
            role="menu"
            aria-label="Paiements"
          >
            <button id="btnPaymentAdd" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Ajouter Paiement
            </button>
            <button
              id="btnPaymentHistory"
              class="model-select-option actions-menu__item"
              type="button"
              role="menuitem"
            >
              Historique paiements
            </button>
            <button
              id="btnPaymentClientStatements"
              class="model-select-option actions-menu__item"
              type="button"
              role="menuitem"
            >
              Solde clients
            </button>
            <button
              id="btnClientLedger"
              class="model-select-option actions-menu__item"
              type="button"
              role="menuitem"
            >
              Relev&eacute; clients
            </button>
          </div>
        </details>
        <details id="generateXmlMenu" class="field-toggle-menu actions-menu">
          <summary
            class="btn field-toggle-trigger actions-menu__trigger better-style"
            role="button"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="generateXmlMenuPanel"
          >
            <span>Générer XML</span>
          </summary>
          <div
            id="generateXmlMenuPanel"
            class="field-toggle-panel actions-menu__panel"
            role="menu"
            aria-label="Générer XML"
          >
            <button id="btnGenerateXmlRetenueFA" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Retenue a la source FA
            </button>
          </div>
        </details>
        <details id="reportsMenu" class="field-toggle-menu actions-menu">
          <summary
            class="btn field-toggle-trigger actions-menu__trigger better-style"
            role="button"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="reportsPanel"
          >
            <span>Rapports</span>
          </summary>
          <div
            id="reportsPanel"
            class="field-toggle-panel actions-menu__panel"
            role="menu"
            aria-label="Rapports"
          >
            <button id="btnReportSalesTax" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Rapport de taxes à la vente
            </button>
            <button id="btnReportPurchaseTax" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Rapport de taxes à l'achat
            </button>
            <button
              id="btnReportClientStatement"
              class="model-select-option actions-menu__item"
              type="button"
              role="menuitem"
            >
            Relevés clients
            </button>
          </div>
        </details>
      </div>
      <div class="actions__alerts">
          <button
            id="clientSavedListHeaderBtn"
            type="button"
            class="client-search__saved stock-alerts__trigger"
            title="Alertes stock"
            aria-label="Afficher les alertes de stock"
            aria-expanded="false"
            aria-controls="stockAlertPopover"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span id="stockAlertBadge" class="stock-alerts__badge" hidden></span>
          </button>
          <div
            id="stockAlertPopover"
            class="stock-alerts"
            role="dialog"
            aria-modal="false"
            hidden
            aria-hidden="true"
          >
            <div class="stock-alerts__card">
              <div class="stock-alerts__header">
                <div class="stock-alerts__title">Alertes stock</div>
                <p id="stockAlertStatus" class="stock-alerts__status" aria-live="polite">1 article en alerte.</p>
              </div>
              <ul id="stockAlertList" class="stock-alerts__list" role="list"></ul>
              <div class="stock-alerts__pagination" id="stockAlertPagination">
                <button
                  type="button"
                  class="stock-alerts__pager-btn"
                  id="stockAlertPrev"
                  aria-label="Page précédente"
                  disabled
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                  Précedent
                </button>
                <div class="stock-alerts__pagination-status" id="stockAlertPageLabel">Page 1 / 1</div>
                <button
                  type="button"
                  class="stock-alerts__pager-btn"
                  id="stockAlertNext"
                  aria-label="Page suivante"
                >
                  Suivant
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
    </header>
    <div id="pdfDocModal" class="swbDialog doc-history-modal pdf-doc-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel doc-history-modal__panel open-doc-modal__panel pdf-doc-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdfDocModalTitle"
      >
        <div class="swbDialog__header">
          <div id="pdfDocModalTitle" class="swbDialog__title">Ouvrir un Documents PDF</div>
          <button id="pdfDocModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
          </div>
          <div class="doc-history-modal__body swbDialog__msg pdf-doc-modal__body">
            <div class="doc-history-modal__filters pdf-doc-modal__filters">
              <label class="doc-history-modal__filter">
                <span>N&deg;</span>
                <input
                  id="pdfDocFilterNumber"
                  type="text"
                  placeholder="Rechercher par num&eacute;ro"
                />
              </label>
              <label class="doc-history-modal__filter">
                <span>Nom du client ou identifiant</span>
                <input
                  id="pdfDocFilterQuery"
                  type="text"
                placeholder="Rechercher un client ou une r&eacute;f&eacute;rence"
              />
            </label>
            <label class="doc-history-modal__filter doc-history-modal__filter--year">
              <span id="pdfDocFilterYearLabel">Ann&eacute;e</span>
              <div class="doc-dialog-model-picker__field">
                <details
                  id="pdfDocFilterYearMenu"
                  class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                >
                  <summary
                    class="btn success field-toggle-trigger"
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-labelledby="pdfDocFilterYearLabel pdfDocFilterYearDisplay"
                  >
                    <span id="pdfDocFilterYearDisplay" class="model-select-display"></span>
                    <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                  </summary>
                  <div
                    id="pdfDocFilterYearPanel"
                    class="field-toggle-panel model-select-panel doc-history-model-panel"
                    role="listbox"
                    aria-labelledby="pdfDocFilterYearLabel"
                  ></div>
                </details>
                <select id="pdfDocFilterYear" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                  <option value=""></option>
                </select>
              </div>
            </label>
            <label class="doc-history-modal__filter">
              <span>Date</span>
              <div class="swb-date-picker" data-date-picker>
                <input
                  id="pdfDocFilterDate"
                  type="text"
                  inputmode="numeric"
                  placeholder="JJ-MM"
                />
                <button
                  type="button"
                  class="swb-date-picker__toggle"
                  data-date-picker-toggle
                  aria-label="Choisir une date"
                >
                  <svg
                    class="swb-date-picker__toggle-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <rect x="3.5" y="5" width="17" height="15" rx="2" />
                    <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round" />
                  </svg>
                </button>
                <div class="swb-date-picker__panel" data-date-picker-panel hidden></div>
              </div>
            </label>
            <button
              type="button"
              class="btn ghost doc-history-modal__filter-clear"
              id="pdfDocFilterClear"
            >
              R&eacute;initialiser
            </button>
          </div>
          <div class="doc-history-modal__content">
            <div id="pdfDocModalList" class="doc-history-modal__list pdf-doc-modal__list" role="list"></div>
            <p id="pdfDocModalStatus" class="doc-history-modal__status pdf-doc-modal__status" aria-live="polite"></p>
          </div>
        </div>
        <div class="client-saved-modal__actions doc-history-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left doc-history-modal__actions-left">
            <button id="pdfDocModalCloseFooter" type="button" class="btn btn-close client-search__close">
              Fermer
            </button>
          </div>
          <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager">
            <button id="pdfDocModalPrev" type="button" class="client-search__edit" disabled="">Pr&eacute;c&eacute;dent</button>
            <span id="pdfDocModalPage" class="client-saved-modal__page doc-history-modal__page" aria-live="polite" aria-label="Page 1 sur 1">
              Page
              <input id="pdfDocModalPageInput" type="number" inputmode="numeric" min="1" step="1" size="3" aria-label="Aller a la page" class="client-saved-modal__page-input doc-history-modal__page-input" max="1" aria-valuemin="1" aria-valuemax="1" aria-valuenow="1">
              /
              <span id="pdfDocModalTotalPages">1</span>
            </span>
            <button id="pdfDocModalNext" type="button" class="client-search__add" disabled="">Suivant</button>
          </div>
        </div>
      </div>
    </div>
    <div id="xmlDocModal" class="swbDialog doc-history-modal pdf-doc-modal xml-doc-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel doc-history-modal__panel open-doc-modal__panel pdf-doc-modal__panel xml-doc-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="xmlDocModalTitle"
      >
        <div class="swbDialog__header">
          <div id="xmlDocModalTitle" class="swbDialog__title">Ouvrir un fichier XML</div>
          <button id="xmlDocModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
          </div>
          <div class="doc-history-modal__body swbDialog__msg pdf-doc-modal__body">
            <div class="doc-history-modal__filters pdf-doc-modal__filters">
              <label class="doc-history-modal__filter">
                <span>R&eacute;f&eacute;rence</span>
                <input
                  id="xmlDocFilterNumber"
                  type="text"
                  placeholder="Rechercher par r&eacute;f&eacute;rence"
                />
              </label>
            <label class="doc-history-modal__filter">
                <span>Nom du fichier</span>
                <input
                  id="xmlDocFilterQuery"
                  type="text"
                placeholder="Rechercher un fichier"
              />
            </label>
            <label class="doc-history-modal__filter doc-history-modal__filter--year">
              <span id="xmlDocFilterYearLabel">Ann&eacute;e</span>
              <div class="doc-dialog-model-picker__field">
                <details
                  id="xmlDocFilterYearMenu"
                  class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                >
                  <summary
                    class="btn success field-toggle-trigger"
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-labelledby="xmlDocFilterYearLabel xmlDocFilterYearDisplay"
                  >
                    <span id="xmlDocFilterYearDisplay" class="model-select-display"></span>
                    <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                  </summary>
                  <div
                    id="xmlDocFilterYearPanel"
                    class="field-toggle-panel model-select-panel doc-history-model-panel"
                    role="listbox"
                    aria-labelledby="xmlDocFilterYearLabel"
                  ></div>
                </details>
                <select id="xmlDocFilterYear" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                  <option value=""></option>
                </select>
              </div>
            </label>
            <label class="doc-history-modal__filter">
              <span>Date</span>
              <div class="swb-date-picker" data-date-picker>
                <input
                  id="xmlDocFilterDate"
                  type="text"
                  inputmode="numeric"
                  placeholder="JJ-MM"
                />
                <button
                  type="button"
                  class="swb-date-picker__toggle"
                  data-date-picker-toggle
                  aria-label="Choisir une date"
                >
                  <svg
                    class="swb-date-picker__toggle-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <rect x="3.5" y="5" width="17" height="15" rx="2" />
                    <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round" />
                  </svg>
                </button>
                <div class="swb-date-picker__panel" data-date-picker-panel hidden></div>
              </div>
            </label>
            <button
              type="button"
              class="btn ghost doc-history-modal__filter-clear"
              id="xmlDocFilterClear"
            >
              R&eacute;initialiser
            </button>
          </div>
          <div class="doc-history-modal__content">
            <div id="xmlDocModalList" class="doc-history-modal__list pdf-doc-modal__list" role="list"></div>
            <p id="xmlDocModalStatus" class="doc-history-modal__status pdf-doc-modal__status" aria-live="polite"></p>
          </div>
        </div>
        <div class="client-saved-modal__actions doc-history-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left doc-history-modal__actions-left">
            <button id="xmlDocModalCloseFooter" type="button" class="btn btn-close client-search__close">
              Fermer
            </button>
          </div>
          <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager pdf-doc-modal__pager">
            <button id="xmlDocModalPrev" type="button" class="client-search__edit" disabled="">Pr&eacute;c&eacute;dent</button>
            <span id="xmlDocModalPage" class="client-saved-modal__page doc-history-modal__page" aria-live="polite" aria-label="Page 1 sur 1">
              Page
              <input id="xmlDocModalPageInput" type="number" inputmode="numeric" min="1" step="1" size="3" aria-label="Aller a la page" class="client-saved-modal__page-input doc-history-modal__page-input" max="1" aria-valuemin="1" aria-valuemax="1" aria-valuenow="1">
              /
              <span id="xmlDocModalTotalPages">1</span>
            </span>
            <button id="xmlDocModalNext" type="button" class="client-search__add" disabled="">Suivant</button>
          </div>
        </div>
      </div>
    </div>
    <div id="paymentModal" class="swbDialog payment-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel payment-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paymentModalTitle"
      >
        <div class="swbDialog__header">
          <div id="paymentModalTitle" class="swbDialog__title">Ajouter Paiement</div>
          <button id="paymentModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="payment-modal__body swbDialog__msg">
          <div class="payment-modal__form">
            <div class="payment-modal__row">
              <label class="payment-modal__field">
                <span>Date de paiement</span>
                <div class="swb-date-picker" data-date-picker>
                  <input
                    id="paymentDate"
                    type="text"
                    inputmode="numeric"
                    placeholder="AAAA-MM-JJ"
                  />
                  <button
                    type="button"
                    class="swb-date-picker__toggle"
                    data-date-picker-toggle
                    aria-label="Choisir une date"
                  >
                    <svg
                      class="swb-date-picker__toggle-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <rect x="3.5" y="5" width="17" height="15" rx="2" />
                      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round" />
                    </svg>
                  </button>
                  <div class="swb-date-picker__panel" data-date-picker-panel hidden></div>
                </div>
              </label>
              <label class="payment-modal__field payment-modal__field--client">
                <span>Client</span>
                <input id="paymentClientSearch" type="text" placeholder="Rechercher un client" autocomplete="off" />
                <div
                  id="paymentClientResults"
                  class="payment-modal__client-results client-search__results"
                  role="listbox"
                  aria-label="Clients"
                  hidden
                ></div>
              </label>
              <label class="payment-modal__field">
                <span>Montant</span>
                <input id="paymentAmount" type="number" min="0" step="0.001" placeholder="0.000" />
              </label>
              <label class="payment-modal__field">
                <span id="paymentMethodLabel">Mode de paiement</span>
                <div class="doc-dialog-model-picker__field">
                    <details
                      id="paymentMethodMenu"
                      class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                    >
                      <summary
                        class="btn success field-toggle-trigger"
                        role="button"
                        aria-haspopup="listbox"
                        aria-expanded="false"
                        aria-labelledby="paymentMethodLabel paymentMethodDisplay"
                      >
                        <span id="paymentMethodDisplay" class="model-select-display">Esp&egrave;ces</span>
                        <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                      </summary>
                      <!--payment-method-panel-placeholder-->
                      <div
                        id="paymentMethodPanel"
                        class="field-toggle-panel model-select-panel doc-history-model-panel"
                        role="listbox"
                        aria-labelledby="paymentMethodLabel"
                      >
                        <button type="button" class="model-select-option is-active" data-value="cash" role="option" aria-selected="true">
                          Esp&egrave;ces
                        </button>
                        <button type="button" class="model-select-option" data-value="cash_deposit" role="option" aria-selected="false">
                          Versement Esp&egrave;ces
                        </button>
                        <button type="button" class="model-select-option" data-value="cheque" role="option" aria-selected="false">
                          Ch&egrave;que
                        </button>
                        <button type="button" class="model-select-option" data-value="bill_of_exchange" role="option" aria-selected="false">
                          Effet
                        </button>
                        <button type="button" class="model-select-option" data-value="transfer" role="option" aria-selected="false">
                          Virement
                        </button>
                        <button type="button" class="model-select-option" data-value="card" role="option" aria-selected="false">
                          Carte bancaire
                        </button>
                        <button type="button" class="model-select-option" data-value="withholding_tax" role="option" aria-selected="false">
                          Retenue &agrave; la source
                        </button>
                        <button type="button" class="model-select-option" data-value="sold_client" role="option" aria-selected="false">
                          Solde client
                        </button>
                      </div>
                    </details>
                    <select id="paymentMethod" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                      <option value="">Choisir un mode</option>
                      <option value="cash" selected>Esp&egrave;ces</option>
                      <option value="cash_deposit">Versement Esp&egrave;ces</option>
                      <option value="cheque">Ch&egrave;que</option>
                      <option value="bill_of_exchange">Effet</option>
                      <option value="transfer">Virement</option>
                      <option value="card">Carte bancaire</option>
                      <option value="withholding_tax">Retenue &agrave; la source</option>
                      <option value="sold_client">Solde client</option>
                    </select>
                </div>
              </label>
              <label class="payment-modal__field">
                <span>R&eacute;f. paiement</span>
                <input id="paymentReference" type="text" placeholder="R&eacute;f. paiement" />
              </label>
            </div>
            <div class="payment-modal__row payment-modal__row--actions">
              <div class="doc-history-convert__field" data-client-field="soldClient">
                <label class="doc-history-convert__label doc-dialog-model-picker__label">
                  Solde client actuel
                </label>
                <div class="payment-modal__amount-cell">
                  <span
                    id="paymentClientSoldeValue"
                    class="payment-modal__field-value"
                    data-base-solde=""
                  >-</span>
                </div>
              </div>
              <button id="paymentAddToSold" type="button" class="btn better-style">
                Ajouter au solde client
              </button>
              <span class="payment-modal__or-pay">
                ou payer les factures qui apparaissent dans le tableau ci-dessous
              </span>
            </div>
          </div>
          <div class="payment-modal__invoices">
            <div class="payment-modal__invoices-header">
              <div class="payment-modal__invoices-title">Factures</div>
              <div class="payment-modal__invoices-balance">
                Montant restant non imput&eacute; :
                <span id="paymentOutstanding">0</span>
              </div>
            </div>
            <div class="payment-modal__invoices-filters">
              <label class="doc-history-modal__filter doc-history-modal__filter--year payment-modal__invoice-filter-year">
                <span id="paymentInvoiceFilterYearLabel">Ann&eacute;e</span>
                <div class="doc-dialog-model-picker__field">
                  <details
                    id="paymentInvoiceFilterYearMenu"
                    class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                  >
                    <summary
                      class="btn success field-toggle-trigger"
                      role="button"
                      aria-haspopup="listbox"
                      aria-expanded="false"
                      aria-labelledby="paymentInvoiceFilterYearLabel paymentInvoiceFilterYearDisplay"
                    >
                      <span id="paymentInvoiceFilterYearDisplay" class="model-select-display"></span>
                      <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                    </summary>
                    <div
                      id="paymentInvoiceFilterYearPanel"
                      class="field-toggle-panel model-select-panel doc-history-model-panel"
                      role="listbox"
                      aria-labelledby="paymentInvoiceFilterYearLabel"
                    ></div>
                  </details>
                  <select id="paymentInvoiceFilterYear" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                    <option value=""></option>
                  </select>
                </div>
              </label>
            </div>
            <div class="table-wrap payment-modal__table-wrap">
              <table class="tabM payment-modal__table">
                <thead>
                  <tr>
                    <th>N&deg; de facture</th>
                    <th class="center">Date</th>
                    <th>&Eacute;ch&eacute;ance</th>
                    <th>Total</th>
                    <th>Imput&eacute;</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody id="paymentInvoiceTableBody">
                  <tr class="payment-modal__empty-row">
                    <td colspan="6">S&eacute;lectionnez un client pour voir les factures impay&eacute;es.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="payment-modal__actions swbDialog__actions client-saved-modal__actions doc-history-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left doc-history-modal__actions-left">
            <button id="paymentModalCloseFooter" type="button" class="btn btn-close client-search__close">
              Fermer
            </button>
          </div>
          <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager">
            <button id="paymentInvoicePrev" type="button" class="client-search__edit" disabled="">
              Pr&eacute;c&eacute;dent
            </button>
            <span id="paymentInvoicePage" class="client-saved-modal__page doc-history-modal__page" aria-live="polite" aria-label="Page 1 sur 1">
              Page
              <input
                id="paymentInvoicePageInput"
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                size="3"
                aria-label="Aller a la page"
                class="client-saved-modal__page-input doc-history-modal__page-input"
                max="1"
                aria-valuemin="1"
                aria-valuemax="1"
                aria-valuenow="1"
              >
              /
              <span id="paymentInvoiceTotalPages">1</span>
            </span>
            <button id="paymentInvoiceNext" type="button" class="client-search__add" disabled="">
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
    <div id="paymentHistoryModal" class="swbDialog payments-history-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel payments-history-modal__panel doc-history-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paymentHistoryTitle"
      >
        <div class="swbDialog__header">
          <div id="paymentHistoryTitle" class="swbDialog__title">Historique paiements</div>
          <button id="paymentHistoryClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="swbDialog__msg payments-history-modal__body">
          <div class="doc-history-modal__filters payments-history__filters">
            <label class="doc-history-modal__filter">
              <span>Numero de paiement</span>
              <input id="paymentHistoryFilterNumber" type="text" placeholder="Rechercher par numero">
            </label>
            <label class="doc-history-modal__filter">
              <span>N&deg; Facture</span>
              <input id="paymentHistoryFilterInvoice" type="text" placeholder="Rechercher une facture">
            </label>
            <label class="doc-history-modal__filter">
              <span>Client</span>
              <input id="paymentHistoryFilterClient" type="text" placeholder="Rechercher un client">
            </label>
            <label class="doc-history-modal__filter doc-history-modal__filter--year">
              <span id="paymentHistoryFilterYearLabel">Ann&eacute;e</span>
              <div class="doc-dialog-model-picker__field">
                <details
                  id="paymentHistoryFilterYearMenu"
                  class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                >
                  <summary
                    class="btn success field-toggle-trigger"
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-labelledby="paymentHistoryFilterYearLabel paymentHistoryFilterYearDisplay"
                  >
                    <span id="paymentHistoryFilterYearDisplay" class="model-select-display"></span>
                    <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                  </summary>
                  <div
                    id="paymentHistoryFilterYearPanel"
                    class="field-toggle-panel model-select-panel doc-history-model-panel"
                    role="listbox"
                    aria-labelledby="paymentHistoryFilterYearLabel"
                  ></div>
                </details>
                <select id="paymentHistoryFilterYear" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                  <option value=""></option>
                </select>
              </div>
            </label>
            <label class="doc-history-modal__filter">
              <span>Date</span>
              <div class="swb-date-picker" data-date-picker="">
                <input id="paymentHistoryFilterDate" type="text" inputmode="numeric" placeholder="JJ-MM" autocomplete="off" spellcheck="false" aria-haspopup="dialog" aria-expanded="false" role="combobox" aria-controls="paymentHistoryFilterDatePanel">
                <button type="button" class="swb-date-picker__toggle" data-date-picker-toggle="" aria-label="Choisir une date" aria-haspopup="dialog" aria-expanded="false" aria-controls="paymentHistoryFilterDatePanel">
                  <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                    <rect x="3.5" y="5" width="17" height="15" rx="2"></rect>
                    <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round"></path>
                  </svg>
                </button>
                <!--swb-date-picker__panel-placeholder-->
                <div class="swb-date-picker__panel" data-date-picker-panel="" hidden="" role="dialog" aria-modal="false" aria-label="Choisir une date" tabindex="-1" id="paymentHistoryFilterDatePanel"></div>
              </div>
            </label>
            <button type="button" class="btn ghost doc-history-modal__filter-clear" id="paymentHistoryFilterClear" disabled="">
              Reinitialiser
            </button>
          </div>
          <div class="table-wrap payments-history__table-wrap">
            <table class="tabM payments-history__table">
              <thead>
                <tr>
                  <th>Num&eacute;ro de paiement</th>
                  <th class="payment-history__align-right">N&deg; Facture</th>
                  <th class="payment-history__align-right">Client</th>
                  <th class="payment-history__align-center">Date de paiement</th>
                  <th class="payment-history__align-center">R&eacute;f. paiement</th>
                  <th class="payment-history__align-right">Montant pay&eacute;</th>
                  <th class="payment-history__align-center">Mode de paiement</th>
                  <th class="payment-history__align-center">Action</th>
                </tr>
              </thead>
              <tbody id="paymentsHistoryModalList"></tbody>
            </table>
          </div>
        </div>
        <div class="client-saved-modal__actions doc-history-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left doc-history-modal__actions-left">
            <button id="paymentHistoryCloseFooter" type="button" class="btn btn-close client-search__close">
              Fermer
            </button>
          </div>
          <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager">
            <button id="paymentHistoryPrev" type="button" class="client-search__edit" disabled>
              Précédent
            </button>
            <span
              id="paymentHistoryPage"
              class="client-saved-modal__page doc-history-modal__page"
              aria-live="polite"
              aria-label="Page 1 sur 1"
            >
              Page
              <input
                id="paymentHistoryPageInput"
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                size="3"
                aria-label="Aller a la page"
                class="client-saved-modal__page-input doc-history-modal__page-input"
                max="1"
                aria-valuemin="1"
                aria-valuemax="1"
                aria-valuenow="1"
              />
              /
              <span id="paymentHistoryTotalPages">1</span>
            </span>
            <button id="paymentHistoryNext" type="button" class="client-search__add" disabled>
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
    <div id="clientLedgerModal" class="swbDialog client-ledger-modal payments-history-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel payments-history-modal__panel doc-history-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clientLedgerTitle"
      >
        <div class="swbDialog__header">
          <div id="clientLedgerTitle" class="swbDialog__title">Relev&eacute; clients</div>
          <button id="clientLedgerClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="swbDialog__msg payments-history-modal__body">
          <div class="doc-history-modal__filters payments-history__filters">
            <label class="doc-history-modal__filter">
              <span>Client</span>
              <input id="clientLedgerFilterClient" type="text" placeholder="Rechercher un client">
            </label>
            <label class="doc-history-modal__filter">
              <span>Num&eacute;ro facture</span>
              <input id="clientLedgerFilterInvoiceNumber" type="text" placeholder="Num&eacute;ro facture">
            </label>
            <label class="doc-history-modal__filter doc-history-modal__filter--year">
              <span id="clientLedgerFilterYearLabel">Ann&eacute;e</span>
              <div class="doc-dialog-model-picker__field">
                <details
                  id="clientLedgerFilterYearMenu"
                  class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                >
                  <summary
                    class="btn success field-toggle-trigger"
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-labelledby="clientLedgerFilterYearLabel clientLedgerFilterYearDisplay"
                  >
                    <span id="clientLedgerFilterYearDisplay" class="model-select-display"></span>
                    <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                  </summary>
                  <div
                    id="clientLedgerFilterYearPanel"
                    class="field-toggle-panel model-select-panel doc-history-model-panel"
                    role="listbox"
                    aria-labelledby="clientLedgerFilterYearLabel"
                  ></div>
                </details>
                <select id="clientLedgerFilterYear" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                  <option value=""></option>
                </select>
              </div>
            </label>
            <label class="doc-history-modal__filter">
              <span>Du</span>
              <div class="swb-date-picker" data-date-picker="">
                <input id="clientLedgerFilterStart" type="text" inputmode="numeric" placeholder="JJ-MM" autocomplete="off" spellcheck="false" aria-haspopup="dialog" aria-expanded="false" role="combobox" aria-controls="clientLedgerFilterStartPanel">
                <button type="button" class="swb-date-picker__toggle" data-date-picker-toggle="" aria-label="Choisir une date" aria-haspopup="dialog" aria-expanded="false" aria-controls="clientLedgerFilterStartPanel">
                  <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                    <rect x="3.5" y="5" width="17" height="15" rx="2"></rect>
                    <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round"></path>
                  </svg>
                </button>
                <div class="swb-date-picker__panel" data-date-picker-panel="" hidden="" role="dialog" aria-modal="false" aria-label="Choisir une date" tabindex="-1" id="clientLedgerFilterStartPanel"></div>
              </div>
            </label>
            <label class="doc-history-modal__filter">
              <span>Au</span>
              <div class="swb-date-picker" data-date-picker="">
                <input id="clientLedgerFilterEnd" type="text" inputmode="numeric" placeholder="JJ-MM" autocomplete="off" spellcheck="false" aria-haspopup="dialog" aria-expanded="false" role="combobox" aria-controls="clientLedgerFilterEndPanel">
                <button type="button" class="swb-date-picker__toggle" data-date-picker-toggle="" aria-label="Choisir une date" aria-haspopup="dialog" aria-expanded="false" aria-controls="clientLedgerFilterEndPanel">
                  <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                    <rect x="3.5" y="5" width="17" height="15" rx="2"></rect>
                    <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round"></path>
                  </svg>
                </button>
                <div class="swb-date-picker__panel" data-date-picker-panel="" hidden="" role="dialog" aria-modal="false" aria-label="Choisir une date" tabindex="-1" id="clientLedgerFilterEndPanel"></div>
              </div>
            </label>
            <button type="button" class="btn ghost doc-history-modal__filter-clear" id="clientLedgerFilterClear" disabled>
              Reinitialiser
            </button>
          </div>
          <div class="doc-history-modal__status-row">
            <p class="doc-history-modal__recap">
              Total D&eacute;bit:
              <span id="clientLedgerTotalDebit" class="doc-history-modal__recap-value">0</span>
              &nbsp;|&nbsp;
              Total Cr&eacute;dit:
              <span id="clientLedgerTotalCredit" class="doc-history-modal__recap-value">0</span>
            </p>
          </div>
          <div class="table-wrap payments-history__table-wrap">
            <table class="tabM payments-history__table client-ledger__table">
              <thead>
                <tr>
                  <th class="payment-history__align-left">Date</th>
                  <th>Facture</th>
                  <th>Client</th>
                  <th>R&eacute;f. paiement</th>
                  <th>Mode de paiement</th>
                  <th class="payment-history__align-right">D&eacute;bit</th>
                  <th class="payment-history__align-right">Cr&eacute;dit</th>
                  <th class="payment-history__align-center">Action</th>
                </tr>
              </thead>
              <tbody id="clientLedgerList"></tbody>
            </table>
          </div>
        </div>
        <div class="client-saved-modal__actions doc-history-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left doc-history-modal__actions-left">
            <button id="clientLedgerCloseFooter" type="button" class="btn btn-close client-search__close">
              Fermer
            </button>
          </div>
          <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager">
            <button id="clientLedgerPrev" type="button" class="client-search__edit" disabled>
              Pr&eacute;c&eacute;dent
            </button>
            <span
              id="clientLedgerPage"
              class="client-saved-modal__page doc-history-modal__page"
              aria-live="polite"
              aria-label="Page 1 sur 1"
            >
              Page
              <input
                id="clientLedgerPageInput"
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                size="3"
                aria-label="Aller a la page"
                class="client-saved-modal__page-input doc-history-modal__page-input"
                max="1"
                aria-valuemin="1"
                aria-valuemax="1"
                aria-valuenow="1"
              />
              /
              <span id="clientLedgerTotalPages">1</span>
            </span>
            <button id="clientLedgerNext" type="button" class="client-search__add" disabled>
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
    <div id="clientStatementsModal" class="swbDialog client-statements-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel payments-history-modal__panel doc-history-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clientStatementsTitle"
      >
        <div class="swbDialog__header">
          <div id="clientStatementsTitle" class="swbDialog__title">Solde client</div>
          <button id="clientStatementsClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="swbDialog__msg payments-history-modal__body credit-clients__body">
          <div class="doc-history-modal__filters payments-history__filters">
            <label class="doc-history-modal__filter">
              <span>Client</span>
              <input id="clientStatementsFilterClient" type="text" placeholder="Rechercher un client">
            </label>
            <label class="doc-history-modal__filter">
              <span id="clientStatementsFilterSoldLabel">Solde</span>
              <div class="doc-dialog-model-picker__field">
                <details
                  id="clientStatementsFilterSoldMenu"
                  class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                >
                  <summary
                    class="btn success field-toggle-trigger"
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-labelledby="clientStatementsFilterSoldLabel clientStatementsFilterSoldDisplay"
                  >
                    <span id="clientStatementsFilterSoldDisplay" class="model-select-display">Tous les soldes</span>
                    <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                  </summary>
                  <div
                    id="clientStatementsFilterSoldPanel"
                    class="field-toggle-panel model-select-panel doc-history-model-panel"
                    role="listbox"
                    aria-labelledby="clientStatementsFilterSoldLabel"
                  >
                    <button type="button" class="model-select-option is-active" data-value="" role="option" aria-selected="true">
                      Tous les soldes
                    </button>
                    <button type="button" class="model-select-option" data-value="eq0" role="option" aria-selected="false">
                      Solde = 0
                    </button>
                    <button type="button" class="model-select-option" data-value="lt0" role="option" aria-selected="false">
                      Solde &lt; 0
                    </button>
                    <button type="button" class="model-select-option" data-value="gt0" role="option" aria-selected="false">
                      Solde &gt; 0
                    </button>
                  </div>
                </details>
                <select id="clientStatementsFilterSold" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                  <option value="" selected>Tous les soldes</option>
                  <option value="eq0">Solde = 0</option>
                  <option value="lt0">Solde &lt; 0</option>
                  <option value="gt0">Solde &gt; 0</option>
                </select>
              </div>
            </label>
            <label class="doc-history-modal__filter doc-history-modal__filter--year">
              <span id="clientStatementsFilterYearLabel">Ann&eacute;e</span>
              <div class="doc-dialog-model-picker__field">
                <details
                  id="clientStatementsFilterYearMenu"
                  class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                >
                  <summary
                    class="btn success field-toggle-trigger"
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-labelledby="clientStatementsFilterYearLabel clientStatementsFilterYearDisplay"
                  >
                    <span id="clientStatementsFilterYearDisplay" class="model-select-display"></span>
                    <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                  </summary>
                  <div
                    id="clientStatementsFilterYearPanel"
                    class="field-toggle-panel model-select-panel doc-history-model-panel"
                    role="listbox"
                    aria-labelledby="clientStatementsFilterYearLabel"
                  ></div>
                </details>
                <select id="clientStatementsFilterYear" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                  <option value=""></option>
                </select>
              </div>
            </label>
            <label class="doc-history-modal__filter">
              <span>Du</span>
              <div class="swb-date-picker" data-date-picker="">
                <input id="clientStatementsFilterStart" type="text" inputmode="numeric" placeholder="JJ-MM" autocomplete="off" spellcheck="false" aria-haspopup="dialog" aria-expanded="false" role="combobox" aria-controls="clientStatementsFilterStartPanel">
                <button type="button" class="swb-date-picker__toggle" data-date-picker-toggle="" aria-label="Choisir une date" aria-haspopup="dialog" aria-expanded="false" aria-controls="clientStatementsFilterStartPanel">
                  <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                    <rect x="3.5" y="5" width="17" height="15" rx="2"></rect>
                    <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round"></path>
                  </svg>
                </button>
                <div class="swb-date-picker__panel" data-date-picker-panel="" hidden="" role="dialog" aria-modal="false" aria-label="Choisir une date" tabindex="-1" id="clientStatementsFilterStartPanel"></div>
              </div>
            </label>
            <label class="doc-history-modal__filter">
              <span>Au</span>
              <div class="swb-date-picker" data-date-picker="">
                <input id="clientStatementsFilterEnd" type="text" inputmode="numeric" placeholder="JJ-MM" autocomplete="off" spellcheck="false" aria-haspopup="dialog" aria-expanded="false" role="combobox" aria-controls="clientStatementsFilterEndPanel">
                <button type="button" class="swb-date-picker__toggle" data-date-picker-toggle="" aria-label="Choisir une date" aria-haspopup="dialog" aria-expanded="false" aria-controls="clientStatementsFilterEndPanel">
                  <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                    <rect x="3.5" y="5" width="17" height="15" rx="2"></rect>
                    <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round"></path>
                  </svg>
                </button>
                <div class="swb-date-picker__panel" data-date-picker-panel="" hidden="" role="dialog" aria-modal="false" aria-label="Choisir une date" tabindex="-1" id="clientStatementsFilterEndPanel"></div>
              </div>
            </label>
            <button type="button" class="btn ghost doc-history-modal__filter-clear" id="clientStatementsFilterClear" disabled>
              Reinitialiser
            </button>
          </div>
          <div class="doc-history-modal__status-row">
            <p class="doc-history-modal__recap">
              Total D&eacute;bit:
              <span id="clientStatementsTotalDebit" class="doc-history-modal__recap-value">0</span>
              &nbsp;|&nbsp;
              Total Cr&eacute;dit:
              <span id="clientStatementsTotalCredit" class="doc-history-modal__recap-value">0</span>
              &nbsp;|&nbsp;
              Solde client:
              <span id="clientStatementsTotalSold" class="doc-history-modal__recap-value">0</span>
            </p>
          </div>
          <div class="table-wrap payments-history__table-wrap credit-clients__table-wrap">
            <table class="tabM payments-history__table credit-clients__table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Total d&eacute;bit</th>
                  <th>Total cr&eacute;dit</th>
                  <th class="payment-history__align-right">Solde client</th>
                </tr>
              </thead>
              <tbody id="clientStatementsList">
                <tr class="payments-panel__empty-row">
                  <td colspan="4">Chargement...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="client-saved-modal__actions doc-history-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left doc-history-modal__actions-left">
            <button id="clientStatementsCloseFooter" type="button" class="btn btn-close client-search__close">
              Fermer
            </button>
          </div>
          <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager">
            <button id="clientStatementsPrev" type="button" class="client-search__edit" disabled>
              Precedent
            </button>
            <span
              id="clientStatementsPage"
              class="client-saved-modal__page doc-history-modal__page"
              aria-live="polite"
              aria-label="Page 1 sur 1"
            >
              Page
              <input
                id="clientStatementsPageInput"
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                size="3"
                aria-label="Aller a la page"
                class="client-saved-modal__page-input doc-history-modal__page-input"
                max="1"
                aria-valuemin="1"
                aria-valuemax="1"
                aria-valuenow="1"
              />
              /
              <span id="clientStatementsTotalPages">1</span>
            </span>
            <button id="clientStatementsNext" type="button" class="client-search__add" disabled>
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
  `);
}
