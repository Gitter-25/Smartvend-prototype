/**
 * Card security screen: display stored ciphertext and keyed lookups without exposing decrypted
 * enrolled UIDs.
 */

import { useData } from '../data/AppData';
import PageHeading from '../components/PageHeading';

/**
 * Render the Card security page with saved AES ciphertext and HMAC lookups. The filename is
 * retained for the existing route.
 */
export default function Encryption() {
  const { cards, students } = useData();

  return (
    <>
      <PageHeading
        title="Card security"
        description="View encrypted identifiers saved for enrolled student cards."
      />
      <section className="card">
        <h3>What is saved for enrolled cards?</h3>
        <p>
          The record contains AES ciphertext, an IV, and a keyed HMAC lookup. Base64 is only a
          display encoding. HMAC is hashing, not another form of encryption.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>AES ciphertext</th>
                <th>HMAC lookup</th>
              </tr>
            </thead>
            <tbody>
              {cards.map(
                // Render one encrypted card record without decrypting its UID for display.
                (card) => (
                  <tr key={card.id}>
                    <td>
                      {
                        students.find(
                          // Find the student name belonging to this encrypted card record.
                          (student) => student.id === card.studentId,
                        )?.name
                      }
                    </td>
                    <td>
                      <code className="ciphertext-cell">{card.envelope.ciphertext}</code>
                    </td>
                    <td>
                      <code className="ciphertext-cell">{card.lookup}</code>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        <p className="scope-note">
          Keys and records stay in this browser profile. This demonstrates encryption; a
          frontend-only prototype does not provide production access control.
        </p>
      </section>
    </>
  );
}
